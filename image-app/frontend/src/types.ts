export interface UploadedImage {
  fileId: string;
  originalName: string;
  size: number;
  previewUrl: string;
  file: File;
}

export interface ProcessedImage {
  fileId: string;
  downloadUrl: string;
  processedSize: number;
}

export interface ImageOperation {
  type: 'resize' | 'crop' | 'convert' | 'quality';
  params: any;
}

export interface ProcessOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}
