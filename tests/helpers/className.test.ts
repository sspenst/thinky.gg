import { blueButton } from '@root/helpers/className';

describe('className constants', () => {
  describe('blueButton', () => {
    test('should contain expected CSS classes', () => {
      expect(blueButton).toBe('bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded disabled:bg-gray-400 disabled:cursor-not-allowed');
    });

    test('should contain background color classes', () => {
      expect(blueButton).toContain('bg-blue-500');
      expect(blueButton).toContain('hover:bg-blue-600');
    });

    test('should contain text styling classes', () => {
      expect(blueButton).toContain('text-white');
      expect(blueButton).toContain('font-medium');
    });

    test('should contain padding classes', () => {
      expect(blueButton).toContain('py-2');
      expect(blueButton).toContain('px-3');
    });

    test('should contain border radius class', () => {
      expect(blueButton).toContain('rounded');
    });

    test('should contain disabled state classes', () => {
      expect(blueButton).toContain('disabled:bg-gray-400');
      expect(blueButton).toContain('disabled:cursor-not-allowed');
    });

    test('should be a string', () => {
      expect(typeof blueButton).toBe('string');
    });

    test('should not be empty', () => {
      expect(blueButton.length).toBeGreaterThan(0);
    });
  });
});

export {};