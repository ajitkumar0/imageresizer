import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import imageRoutes from '../src/routes/image';
import { errorHandler } from '../src/middleware/errorHandler';
import { StorageService } from '../src/services/storage';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', imageRoutes);
  app.use(errorHandler);
  return app;
};

describe('API Integration Tests', () => {
  let app: express.Application;
  let storage: StorageService;

  beforeAll(async () => {
    app = createTestApp();
    storage = new StorageService();
    await storage.initialize();
  });

  describe('GET /health', () => {
    it('should return 404 for non-existent health endpoint on api routes', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/upload', () => {
    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app).post('/api/upload');
      expect(response.status).toBe(400);
    });

    it('should accept multipart form data', async () => {
      // This test would require an actual image file
      const response = await request(app)
        .post('/api/upload')
        .attach('image', Buffer.from('fake'), 'test.jpg');

      // Expected to fail validation but should reach the handler
      expect([400, 413, 500]).toContain(response.status);
    });
  });

  describe('POST /api/process', () => {
    it('should return 400 for invalid request body', async () => {
      const response = await request(app).post('/api/process').send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent file', async () => {
      const response = await request(app).post('/api/process').send({
        fileId: 'non-existent-id',
        operations: [
          {
            type: 'resize',
            params: { width: 100, height: 100 },
          },
        ],
      });

      expect(response.status).toBe(404);
    });

    it('should validate operations array', async () => {
      const response = await request(app).post('/api/process').send({
        fileId: 'test-id',
        operations: 'invalid',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/images', () => {
    it('should return list of images', async () => {
      const response = await request(app).get('/api/images');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('DELETE /api/images/:fileId', () => {
    it('should return 404 for non-existent file', async () => {
      const response = await request(app).delete('/api/images/non-existent-id');
      expect(response.status).toBe(404);
    });
  });
});
