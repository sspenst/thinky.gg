import levelUtil from '@root/constants/LevelUtil';
import { TileType } from '@root/constants/tileType';

describe('constants/*.ts', () => {
  test('LevelDataType.toString()', async () => {
    const levelDataType = levelUtil.toString();

    expect(levelDataType).toBeDefined();
    expect(Object.keys(levelDataType).length).toBe(20);
  });
  test('LevelDataType.isRaised()', async () => {
    expect(levelUtil.isRaised(TileType.Block)).toBeTruthy();
  });
  test('getInvalidLevelDataType with valid input', async () => {
    const res = levelUtil.getInvalidLevelDataType('4');

    expect(res).toBeUndefined();
  });
  test('getInvalidLevelDataType with valid input', async () => {
    const res = levelUtil.getInvalidLevelDataType('Z');

    expect(res).toBe('Z');
  });
});

export { };
