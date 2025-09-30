export interface ImageMetadata {
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
  rawPath: string;
  processedPath?: string;
  timestamp: number;
  operations?: ImageOperation[];
}

export interface ImageOperation {
  type: 'resize' | 'crop' | 'convert' | 'quality';
  params: ResizeParams | CropParams | ConvertParams | QualityParams;
}

export interface ResizeParams {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConvertParams {
  format: 'jpeg' | 'png' | 'webp';
}

export interface QualityParams {
  quality: number; // 0-100
}

export interface ProcessRequest {
  fileId: string;
  operations: ImageOperation[];
}

export interface UploadResponse {
  fileId: string;
  originalName: string;
  size: number;
  previewUrl: string;
}

export interface ProcessResponse {
  fileId: string;
  downloadUrl: string;
  processedSize: number;
}

export interface AppConfig {
  port: number;
  host: string;
  uploadDir: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  cleanupTtlHours: number;
  cleanupIntervalHours: number;
  corsOrigin: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  maxDiskQuota: number;
}
