import { sanitizeFilename } from '../src/utils/validation';

describe('Validation Utils', () => {
  describe('sanitizeFilename', () => {
    it('should remove special characters', () => {
      const input = 'file@name#with$special%chars.jpg';
      const output = sanitizeFilename(input);
      expect(output).toBe('file_name_with_special_chars.jpg');
    });

    it('should keep allowed characters', () => {
      const input = 'valid-file_name.123.jpg';
      const output = sanitizeFilename(input);
      expect(output).toBe('valid-file_name.123.jpg');
    });

    it('should handle spaces', () => {
      const input = 'file with spaces.jpg';
      const output = sanitizeFilename(input);
      expect(output).toBe('file_with_spaces.jpg');
    });

    it('should handle empty string', () => {
      const input = '';
      const output = sanitizeFilename(input);
      expect(output).toBe('');
    });
  });
});
