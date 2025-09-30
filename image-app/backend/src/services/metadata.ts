import fs from 'fs/promises';
import path from 'path';
import { ImageMetadata } from '../types';
import logger from '../utils/logger';

const METADATA_FILE = 'metadata.json';

export class MetadataStore {
  private metadataPath: string;
  private cache: Map<string, ImageMetadata> = new Map();

  constructor(uploadDir: string) {
    this.metadataPath = path.join(uploadDir, METADATA_FILE);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.metadataPath, 'utf-8');
      const records: ImageMetadata[] = JSON.parse(data);
      records.forEach((record) => this.cache.set(record.fileId, record));
      logger.info(`Loaded ${records.length} metadata records`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info('Metadata file not found, creating new one');
        await this.save();
      } else {
        logger.error('Error loading metadata', error);
      }
    }
  }

  async save(): Promise<void> {
    const records = Array.from(this.cache.values());
    await fs.writeFile(this.metadataPath, JSON.stringify(records, null, 2));
  }

  async set(fileId: string, metadata: ImageMetadata): Promise<void> {
    this.cache.set(fileId, metadata);
    await this.save();
  }

  get(fileId: string): ImageMetadata | undefined {
    return this.cache.get(fileId);
  }

  async delete(fileId: string): Promise<void> {
    this.cache.delete(fileId);
    await this.save();
  }

  list(): ImageMetadata[] {
    return Array.from(this.cache.values());
  }

  async cleanup(ttlMs: number): Promise<number> {
    const now = Date.now();
    let deleted = 0;

    for (const [fileId, metadata] of this.cache.entries()) {
      if (now - metadata.timestamp > ttlMs) {
        this.cache.delete(fileId);
        deleted++;
      }
    }

    if (deleted > 0) {
      await this.save();
    }

    return deleted;
  }
}
