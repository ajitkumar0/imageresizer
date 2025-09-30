import fs from 'fs/promises';
import path from 'path';
import { config } from '../utils/config';
import logger from '../utils/logger';

export class StorageService {
  private uploadDir: string;
  private rawDir: string;
  private processedDir: string;

  constructor() {
    this.uploadDir = config.uploadDir;
    this.rawDir = path.join(this.uploadDir, 'raw');
    this.processedDir = path.join(this.uploadDir, 'processed');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.rawDir, { recursive: true });
    await fs.mkdir(this.processedDir, { recursive: true });
    await fs.mkdir('logs', { recursive: true });
    logger.info('Storage directories initialized');
  }

  async checkDiskQuota(): Promise<boolean> {
    try {
      const totalSize = await this.calculateDirectorySize(this.uploadDir);
      return totalSize < config.maxDiskQuota;
    } catch (error) {
      logger.error('Error checking disk quota', error);
      return false;
    }
  }

  private async calculateDirectorySize(directory: string): Promise<number> {
    let totalSize = 0;

    try {
      const files = await fs.readdir(directory, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(directory, file.name);

        if (file.isDirectory()) {
          totalSize += await this.calculateDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      logger.error(`Error calculating directory size for ${directory}`, error);
    }

    return totalSize;
  }

  getRawPath(filename: string): string {
    return path.join(this.rawDir, filename);
  }

  getProcessedPath(filename: string): string {
    return path.join(this.processedDir, filename);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info(`Deleted file: ${filePath}`);
    } catch (error) {
      logger.error(`Error deleting file: ${filePath}`, error);
    }
  }

  async cleanupOldFiles(ttlHours: number): Promise<void> {
    const ttlMs = ttlHours * 60 * 60 * 1000;
    const now = Date.now();

    await this.cleanupDirectory(this.rawDir, now, ttlMs);
    await this.cleanupDirectory(this.processedDir, now, ttlMs);
  }

  private async cleanupDirectory(directory: string, now: number, ttlMs: number): Promise<void> {
    try {
      const files = await fs.readdir(directory);

      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile() && now - stats.mtimeMs > ttlMs) {
          await this.deleteFile(filePath);
        }
      }
    } catch (error) {
      logger.error(`Error cleaning up directory: ${directory}`, error);
    }
  }
}
