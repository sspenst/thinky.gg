import Direction, { getDirectionFromCode, directionToVector } from '@root/constants/direction';
import Position from '@root/models/position';

describe('Direction constants', () => {
  describe('getDirectionFromCode', () => {
    test('should return LEFT for ArrowLeft', () => {
      expect(getDirectionFromCode('ArrowLeft')).toBe(Direction.LEFT);
    });

    test('should return LEFT for KeyA', () => {
      expect(getDirectionFromCode('KeyA')).toBe(Direction.LEFT);
    });

    test('should return UP for ArrowUp', () => {
      expect(getDirectionFromCode('ArrowUp')).toBe(Direction.UP);
    });

    test('should return UP for KeyW', () => {
      expect(getDirectionFromCode('KeyW')).toBe(Direction.UP);
    });

    test('should return RIGHT for ArrowRight', () => {
      expect(getDirectionFromCode('ArrowRight')).toBe(Direction.RIGHT);
    });

    test('should return RIGHT for KeyD', () => {
      expect(getDirectionFromCode('KeyD')).toBe(Direction.RIGHT);
    });

    test('should return DOWN for ArrowDown', () => {
      expect(getDirectionFromCode('ArrowDown')).toBe(Direction.DOWN);
    });

    test('should return DOWN for KeyS', () => {
      expect(getDirectionFromCode('KeyS')).toBe(Direction.DOWN);
    });

    test('should return undefined for invalid key codes', () => {
      expect(getDirectionFromCode('KeyZ')).toBeUndefined();
      expect(getDirectionFromCode('Space')).toBeUndefined();
      expect(getDirectionFromCode('Enter')).toBeUndefined();
      expect(getDirectionFromCode('')).toBeUndefined();
    });
  });

  describe('directionToVector', () => {
    test('should return Position(-1, 0) for LEFT', () => {
      const result = directionToVector(Direction.LEFT);
      expect(result).toEqual(new Position(-1, 0));
    });

    test('should return Position(0, -1) for UP', () => {
      const result = directionToVector(Direction.UP);
      expect(result).toEqual(new Position(0, -1));
    });

    test('should return Position(1, 0) for RIGHT', () => {
      const result = directionToVector(Direction.RIGHT);
      expect(result).toEqual(new Position(1, 0));
    });

    test('should return Position(0, 1) for DOWN', () => {
      const result = directionToVector(Direction.DOWN);
      expect(result).toEqual(new Position(0, 1));
    });

    test('should return Position(0, 0) for NONE', () => {
      const result = directionToVector(Direction.NONE);
      expect(result).toEqual(new Position(0, 0));
    });

    test('should return Position(0, 0) for invalid direction', () => {
      const result = directionToVector(999 as Direction);
      expect(result).toEqual(new Position(0, 0));
    });
  });

  describe('Direction enum values', () => {
    test('should have correct enum values', () => {
      expect(Direction.LEFT).toBe(1);
      expect(Direction.UP).toBe(2);
      expect(Direction.RIGHT).toBe(3);
      expect(Direction.DOWN).toBe(4);
      expect(Direction.NONE).toBe(5);
    });
  });
});

export {};