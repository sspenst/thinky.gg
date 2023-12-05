import Direction from '@root/constants/direction';
import TestId from '@root/constants/testId';
import validateSolution, { randomRotateLevelDataViaMatchHash } from '@root/helpers/validateSolution';
import Level from '@root/models/db/level';
import { Types } from 'mongoose';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
describe('validateSolution.ts', () => {
  test('valid solution', async () => {
    expect(validateSolution([
      Direction.RIGHT,
    ], {
      data: '43',
      height: 1,
      width: 2,
    } as Level)).toBeTruthy();
  });
  test('moving off exit', async () => {
    expect(validateSolution([
      Direction.RIGHT,
      Direction.RIGHT,
    ], {
      data: '43',
      height: 1,
      width: 2,
    } as Level)).toBeFalsy();
  });
  test('OOB', async () => {
    expect(validateSolution([
      Direction.UP,
      Direction.RIGHT,
      Direction.DOWN,
    ], {
      data: '43',
      height: 1,
      width: 2,
    } as Level)).toBeFalsy();
  });

  test('valid solution 2', async () => {
    expect(validateSolution([
      Direction.DOWN,
      Direction.DOWN,
      Direction.RIGHT,
      Direction.RIGHT,
    ], {
      data: '401\n0C5\n003',
      height: 3,
      width: 3,
    } as Level)).toBeTruthy();
  });
  test('move onto wall', async () => {
    expect(validateSolution([
      Direction.RIGHT,
      Direction.RIGHT,
      Direction.DOWN,
      Direction.DOWN,
    ], {
      data: '401\n0C5\n003',
      height: 3,
      width: 3,
    } as Level)).toBeFalsy();
  });
  test('move onto hole', async () => {
    expect(validateSolution([
      Direction.RIGHT,
      Direction.DOWN,
      Direction.RIGHT,
      Direction.DOWN,
    ], {
      data: '401\n0C5\n003',
      height: 3,
      width: 3,
    } as Level)).toBeFalsy();
  });
  test('move block an invalid direction', async () => {
    expect(validateSolution([
      Direction.DOWN,
      Direction.DOWN,
      Direction.RIGHT,
      Direction.UP,
      Direction.DOWN,
      Direction.RIGHT,
    ], {
      data: '401\n0C5\n003',
      height: 3,
      width: 3,
    } as Level)).toBeFalsy();
  });
  test('move block OOB', async () => {
    expect(validateSolution([
      Direction.RIGHT,
      Direction.DOWN,
      Direction.DOWN,
      Direction.RIGHT,
    ], {
      data: '401\n0C5\n003',
      height: 3,
      width: 3,
    } as Level)).toBeFalsy();
  });
  test('valid solution through hole', async () => {
    expect(validateSolution([
      Direction.DOWN,
      Direction.RIGHT,
      Direction.RIGHT,
      Direction.DOWN,
    ], {
      data: '401\n0C5\n003',
      height: 3,
      width: 3,
    } as Level)).toBeTruthy();
  });
  test('incomplete', async () => {
    expect(validateSolution([
      Direction.DOWN,
    ], {
      data: '401\n0C5\n003',
      height: 3,
      width: 3,
    } as Level)).toBeFalsy();
  });

  test('rotate 1x3 level (flipLevelX)', async () => {
    const level = {
      _id: new Types.ObjectId(TestId.LEVEL),
      data: '403',
      height: 1,
      width: 3,
    } as Level;

    // hash is 4 so we should get flipLevelX
    randomRotateLevelDataViaMatchHash(level, '4');

    expect(level.data).toBe('304');
    expect(level.height).toBe(1);
    expect(level.width).toBe(3);
  });
});

export {};
