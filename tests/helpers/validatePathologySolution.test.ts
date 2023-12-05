import Direction from '@root/constants/direction';
import validatePathologySolution from '@root/helpers/solutionValidators/validatePathologySolution';
import Level from '@root/models/db/level';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
describe('validatePathologySolution.ts', () => {
  test('valid solution', async () => {
    expect(validatePathologySolution([
      Direction.RIGHT,
    ], {
      data: '43',
      height: 1,
      width: 2,
    } as Level)).toBeTruthy();
  });
  test('moving off exit', async () => {
    expect(validatePathologySolution([
      Direction.RIGHT,
      Direction.RIGHT,
    ], {
      data: '43',
      height: 1,
      width: 2,
    } as Level)).toBeFalsy();
  });
  test('OOB', async () => {
    expect(validatePathologySolution([
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
    expect(validatePathologySolution([
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
    expect(validatePathologySolution([
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
    expect(validatePathologySolution([
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
    expect(validatePathologySolution([
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
    expect(validatePathologySolution([
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
    expect(validatePathologySolution([
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
    expect(validatePathologySolution([
      Direction.DOWN,
    ], {
      data: '401\n0C5\n003',
      height: 3,
      width: 3,
    } as Level)).toBeFalsy();
  });
});

export {};
