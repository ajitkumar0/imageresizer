import { fromBuffer } from 'file-type';
import { config } from './config';

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
};

export async function validateFileSignature(buffer: Buffer): Promise<boolean> {
  const fileTypeResult = await fromBuffer(buffer);

  if (!fileTypeResult) {
    return false;
  }

  const { mime } = fileTypeResult;

  if (!config.allowedMimeTypes.includes(mime)) {
    return false;
  }

  // Verify magic bytes
  const signatures = MAGIC_BYTES[mime];
  if (!signatures) {
    return false;
  }

  for (const signature of signatures) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return true;
    }
  }

  return false;
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}
