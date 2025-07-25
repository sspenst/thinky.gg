import Direction from '@root/constants/direction';
import validateSokopathSolution from '@root/helpers/validators/validateSokopath';
import Level from '@root/models/db/level';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
describe('validateSokopathSolution.ts', () => {
  test('valid solution, player on start', async () => {
    expect(validateSokopathSolution([
      Direction.DOWN,
      Direction.RIGHT,
      Direction.RIGHT,
      Direction.RIGHT,
      Direction.UP,
      Direction.LEFT,
      Direction.LEFT,
    ], {
      data: 'Z0200\n00000',
      height: 2,
      width: 5,
    } as Level)).toBeTruthy();
  });
  test('valid solution', async () => {
    expect(validateSokopathSolution([
      Direction.LEFT,
    ], {
      data: '324',
      height: 1,
      width: 3,
    } as Level)).toBeTruthy();
  });
  test('OOB', async () => {
    expect(validateSokopathSolution([
      Direction.UP,
      Direction.DOWN,
      Direction.LEFT,
    ], {
      data: '324',
      height: 1,
      width: 3,
    } as Level)).toBeFalsy();
  });

  test('valid solution 2', async () => {
    expect(validateSokopathSolution([
      Direction.RIGHT,
    ], {
      data: '423\n010\n050',
      height: 3,
      width: 3,
    } as Level)).toBeTruthy();
  });
  test('move onto wall', async () => {
    expect(validateSokopathSolution([
      Direction.DOWN,
      Direction.RIGHT,
      Direction.LEFT,
      Direction.UP,
      Direction.RIGHT,
    ], {
      data: '423\n010\n050',
      height: 3,
      width: 3,
    } as Level)).toBeFalsy();
  });
  test('move onto hole', async () => {
    expect(validateSokopathSolution([
      Direction.DOWN,
      Direction.DOWN,
      Direction.RIGHT,
      Direction.LEFT,
      Direction.UP,
      Direction.UP,
      Direction.RIGHT,
    ], {
      data: '423\n010\n050',
      height: 3,
      width: 3,
    } as Level)).toBeFalsy();
  });

  test('valid solution 3', async () => {
    expect(validateSokopathSolution([
      Direction.RIGHT,
      Direction.LEFT,
      Direction.DOWN,
      Direction.DOWN,
      Direction.RIGHT,
      Direction.RIGHT,
      Direction.UP,
      Direction.LEFT,
    ], {
      data: '423\n320\n000',
      height: 3,
      width: 3,
    } as Level)).toBeTruthy();
  });
  test('only complete one exit', async () => {
    expect(validateSokopathSolution([
      Direction.RIGHT,
    ], {
      data: '423\n320\n000',
      height: 3,
      width: 3,
    } as Level)).toBeFalsy();
  });
  test('block starting on exit (invalid)', async () => {
    expect(validateSokopathSolution([
      Direction.RIGHT,
    ], {
      data: '4K3\n020\n000',
      height: 3,
      width: 3,
    } as Level)).toBeFalsy();
  });
  test('block starting on exit (valid)', async () => {
    expect(validateSokopathSolution([
      Direction.RIGHT,
      Direction.LEFT,
      Direction.DOWN,
      Direction.DOWN,
      Direction.RIGHT,
      Direction.UP,
    ], {
      data: '4K3\n020\n000',
      height: 3,
      width: 3,
    } as Level)).toBeTruthy();
  });
});

export { };
