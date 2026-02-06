import * as transformLevel from '../../helpers/transformLevel';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
describe('helpers/transformLevel.ts', () => {
  test('dimensions', async () => {
    const data = '123\n456';

    expect(transformLevel.getHeight(data)).toBe(2);
    expect(transformLevel.getWidth(data)).toBe(3);
  });
  test('trim', async () => {
    const data = '1111\n1401\n1031\n1111';

    expect(transformLevel.trimLevel(data)).toBe('40\n03');
  });
  test('simplifyFillHoles', async () => {
    const data = '000000000\n001111100\n014000010\n010010010\n010101010\n010010010\n010000010\n001111100\n000000000';

    expect(transformLevel.simplifyLevelUnreachable(data)).toBe('111111111\n111111111\n114000011\n110010011\n110111011\n110010011\n110000011\n111111111\n111111111');
  });
  test('simplifyKeepMoveableBlocksNotPushedIntoWalls', async () => {
    const data = '00080\n09569\n02799\n08471';

    expect(transformLevel.simplifyLevelUnreachable(data)).toBe('00080\n09569\n02791\n08411');
  });
  test('simplifySequence', async () => {
    const data = '1071\n1635\n1064';

    expect(transformLevel.simplifyLevelUnreachable(data)).toBe('1111\n1135\n1064');
  });
  test('symmetries', async () => {
    const data = 'E0\n00';

    expect(transformLevel.rotateLevelCCW(data)).toBe('00\nH0');
    expect(transformLevel.rotateLevelCW(data)).toBe('0F\n00');
    expect(transformLevel.flipLevelY(data)).toBe('00\nE0');
    expect(transformLevel.flipLevelX(data)).toBe('0G\n00');
    expect(transformLevel.getAllLevelSymmetries(data)).toStrictEqual([
      'E0\n00',
      '00\nH0',
      '00\n0G',
      '0F\n00',
      '00\n0H',
      '0G\n00',
      'F0\n00',
      '00\nE0',
    ]);
  });
});

export { };
