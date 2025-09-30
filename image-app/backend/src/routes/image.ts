import express, { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { upload } from '../middleware/upload';
import { uploadLimiter, processLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { ImageProcessor } from '../controllers/processor';
import { MetadataStore } from '../services/metadata';
import { StorageService } from '../services/storage';
import { validateFileSignature } from '../utils/validation';
import { ProcessRequest, UploadResponse, ProcessResponse } from '../types';
import logger from '../utils/logger';

const router = express.Router();
const processor = new ImageProcessor();
const storage = new StorageService();
const metadata = new MetadataStore(process.env.UPLOAD_DIR || './uploads');

/**
 * POST /api/upload
 * Upload a single image file
 */
router.post(
  '/upload',
  uploadLimiter,
  upload.single('image'),
  async (req: Request, res: Response, next) => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      // Check disk quota
      const hasSpace = await storage.checkDiskQuota();
      if (!hasSpace) {
        await storage.deleteFile(req.file.path);
        throw new AppError('Disk quota exceeded', 507);
      }

      // Validate file signature (magic bytes)
      const buffer = await fs.readFile(req.file.path);
      const isValid = await validateFileSignature(buffer);

      if (!isValid) {
        await storage.deleteFile(req.file.path);
        throw new AppError('Invalid file format or corrupted file', 400);
      }

      const fileId = path.parse(req.file.filename).name;

      // Store metadata
      await metadata.set(fileId, {
        fileId,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        rawPath: req.file.path,
        timestamp: Date.now(),
      });

      const response: UploadResponse = {
        fileId,
        originalName: req.file.originalname,
        size: req.file.size,
        previewUrl: `/api/images/raw/${req.file.filename}`,
      };

      logger.info(`File uploaded: ${fileId}`, {
        originalName: req.file.originalname,
        size: req.file.size,
      });

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/process
 * Process an uploaded image with operations
 */
router.post('/process', processLimiter, async (req: Request, res: Response, next) => {
  try {
    const { fileId, operations }: ProcessRequest = req.body;

    if (!fileId || !operations || !Array.isArray(operations)) {
      throw new AppError('Invalid request body', 400);
    }

    // Get metadata
    const meta = metadata.get(fileId);
    if (!meta) {
      throw new AppError('File not found', 404);
    }

    // Check if file exists
    try {
      await fs.access(meta.rawPath);
    } catch {
      throw new AppError('File not found on disk', 404);
    }

    // Determine output format
    let outputFormat = 'jpeg';
    for (const op of operations) {
      if (op.type === 'convert' && 'format' in op.params) {
        outputFormat = op.params.format;
      }
    }

    const outputExt = processor.getExtensionFromFormat(outputFormat);
    const outputFilename = processor.generateFilename(outputExt);
    const outputPath = storage.getProcessedPath(outputFilename);

    // Process image
    const result = await processor.processImage(meta.rawPath, outputPath, operations);

    // Update metadata
    meta.processedPath = outputPath;
    meta.operations = operations;
    await metadata.set(fileId, meta);

    const response: ProcessResponse = {
      fileId,
      downloadUrl: `/api/images/processed/${outputFilename}`,
      processedSize: result.size,
    };

    logger.info(`Image processed: ${fileId}`, {
      operations: operations.length,
      outputSize: result.size,
    });

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/images/raw/:filename
 * Serve raw uploaded image
 */
router.get('/images/raw/:filename', async (req: Request, res: Response, next) => {
  try {
    const { filename } = req.params;
    const filePath = storage.getRawPath(filename);

    await fs.access(filePath);

    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    next(new AppError('File not found', 404));
  }
});

/**
 * GET /api/images/processed/:filename
 * Serve processed image
 */
router.get('/images/processed/:filename', async (req: Request, res: Response, next) => {
  try {
    const { filename } = req.params;
    const filePath = storage.getProcessedPath(filename);

    await fs.access(filePath);

    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    next(new AppError('File not found', 404));
  }
});

/**
 * DELETE /api/images/:fileId
 * Delete an image and its metadata
 */
router.delete('/images/:fileId', async (req: Request, res: Response, next) => {
  try {
    const { fileId } = req.params;

    const meta = metadata.get(fileId);
    if (!meta) {
      throw new AppError('File not found', 404);
    }

    // Delete files
    if (meta.rawPath) {
      await storage.deleteFile(meta.rawPath);
    }
    if (meta.processedPath) {
      await storage.deleteFile(meta.processedPath);
    }

    // Delete metadata
    await metadata.delete(fileId);

    logger.info(`Image deleted: ${fileId}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/images
 * List all images (admin endpoint)
 */
router.get('/images', async (_req: Request, res: Response, next) => {
  try {
    const images = metadata.list();
    res.status(200).json(images);
  } catch (error) {
    next(error);
  }
});

export default router;
