import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { ImageOperation, ConvertParams, CropParams, QualityParams, ResizeParams } from '../types';
import logger from '../utils/logger';

export class ImageProcessor {
  /**
   * Process an image with the given operations pipeline
   * Re-encodes the image and strips metadata for security
   */
  async processImage(
    inputPath: string,
    outputPath: string,
    operations: ImageOperation[]
  ): Promise<{ size: number; format: string }> {
    try {
      let pipeline = sharp(inputPath);

      // Strip metadata for security
      pipeline = pipeline.rotate(); // Auto-rotate based on EXIF

      // Apply operations in order
      for (const operation of operations) {
        pipeline = this.applyOperation(pipeline, operation);
      }

      // Default output format
      let outputFormat = 'jpeg';
      let quality = 80;

      // Extract format and quality from operations
      for (const operation of operations) {
        if (operation.type === 'convert') {
          outputFormat = (operation.params as ConvertParams).format;
        }
        if (operation.type === 'quality') {
          quality = (operation.params as QualityParams).quality;
        }
      }

      // Apply output format with quality
      switch (outputFormat) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality, compressionLevel: 9 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        default:
          pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      }

      // Execute pipeline and save
      const info = await pipeline.toFile(outputPath);

      logger.info(`Processed image: ${outputPath}`, {
        size: info.size,
        format: info.format,
        width: info.width,
        height: info.height,
      });

      return {
        size: info.size,
        format: info.format,
      };
    } catch (error) {
      logger.error('Error processing image', error);
      throw new Error(`Image processing failed: ${(error as Error).message}`);
    }
  }

  private applyOperation(pipeline: sharp.Sharp, operation: ImageOperation): sharp.Sharp {
    switch (operation.type) {
      case 'resize':
        return this.applyResize(pipeline, operation.params as ResizeParams);
      case 'crop':
        return this.applyCrop(pipeline, operation.params as CropParams);
      case 'convert':
        // Handled in main pipeline
        return pipeline;
      case 'quality':
        // Handled in main pipeline
        return pipeline;
      default:
        logger.warn(`Unknown operation type: ${operation.type}`);
        return pipeline;
    }
  }

  private applyResize(pipeline: sharp.Sharp, params: ResizeParams): sharp.Sharp {
    const { width, height, fit = 'cover' } = params;

    return pipeline.resize(width, height, {
      fit: fit as keyof sharp.FitEnum,
      withoutEnlargement: false,
    });
  }

  private applyCrop(pipeline: sharp.Sharp, params: CropParams): sharp.Sharp {
    const { x, y, width, height } = params;

    return pipeline.extract({
      left: Math.round(x),
      top: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    });
  }

  /**
   * Generate a unique filename with the given extension
   */
  generateFilename(extension: string): string {
    return `${uuidv4()}.${extension}`;
  }

  /**
   * Get file extension from format
   */
  getExtensionFromFormat(format: string): string {
    const formatMap: Record<string, string> = {
      jpeg: 'jpg',
      png: 'png',
      webp: 'webp',
      gif: 'gif',
    };

    return formatMap[format] || 'jpg';
  }
}
