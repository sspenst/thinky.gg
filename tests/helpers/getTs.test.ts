import { TimerUtil } from '@root/helpers/getTs';

describe('TimerUtil', () => {
  describe('getTs', () => {
    test('should return current timestamp in seconds', () => {
      const beforeTs = Math.floor(Date.now() / 1000);
      const result = TimerUtil.getTs();
      const afterTs = Math.floor(Date.now() / 1000);

      expect(result).toBeGreaterThanOrEqual(beforeTs);
      expect(result).toBeLessThanOrEqual(afterTs);
      expect(Number.isInteger(result)).toBe(true);
    });

    test('should return different values when called at different times', async () => {
      const ts1 = TimerUtil.getTs();
      
      // Wait a small amount of time to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1001));
      
      const ts2 = TimerUtil.getTs();
      
      expect(ts2).toBeGreaterThan(ts1);
    });

    test('should return timestamp as integer (no decimal places)', () => {
      const result = TimerUtil.getTs();
      expect(result % 1).toBe(0); // Check if it's a whole number
    });

    test('should return reasonable timestamp value', () => {
      const result = TimerUtil.getTs();
      const year2020 = 1577836800; // January 1, 2020 in seconds
      const year2030 = 1893456000; // January 1, 2030 in seconds
      
      expect(result).toBeGreaterThan(year2020);
      expect(result).toBeLessThan(year2030);
    });
  });
});

export {};