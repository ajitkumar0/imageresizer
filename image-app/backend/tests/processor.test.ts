import { ImageProcessor } from '../src/controllers/processor';
import { ImageOperation } from '../src/types';

describe('ImageProcessor', () => {
  let processor: ImageProcessor;

  beforeEach(() => {
    processor = new ImageProcessor();
  });

  describe('generateFilename', () => {
    it('should generate a filename with UUID and extension', () => {
      const filename = processor.generateFilename('jpg');
      expect(filename).toMatch(/^[a-f0-9-]{36}\.jpg$/);
    });

    it('should handle different extensions', () => {
      const extensions = ['jpg', 'png', 'webp', 'gif'];
      extensions.forEach((ext) => {
        const filename = processor.generateFilename(ext);
        expect(filename).toMatch(new RegExp(`\\.${ext}$`));
      });
    });
  });

  describe('getExtensionFromFormat', () => {
    it('should return correct extension for jpeg', () => {
      expect(processor.getExtensionFromFormat('jpeg')).toBe('jpg');
    });

    it('should return correct extension for png', () => {
      expect(processor.getExtensionFromFormat('png')).toBe('png');
    });

    it('should return correct extension for webp', () => {
      expect(processor.getExtensionFromFormat('webp')).toBe('webp');
    });

    it('should return jpg as default for unknown format', () => {
      expect(processor.getExtensionFromFormat('unknown')).toBe('jpg');
    });
  });
});
