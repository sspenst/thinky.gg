import LevelUtil from '../../constants/levelDataType';

describe('constants/*.ts', () => {
  test('LevelDataType.toString()', async () => {
    const levelDataType = LevelUtil.toString();

    expect(levelDataType).toBeDefined();
    expect(Object.keys(levelDataType).length).toBe(20);
  });
  test('LevelDataType.isRaised()', async () => {
    expect(LevelUtil.isRaised(LevelUtil.Block)).toBeTruthy();
  });
  test('getInvalidLevelDataType with valid input', async () => {
    const res = LevelUtil.getInvalidLevelDataType('4');

    expect(res).toBeUndefined();
  });
  test('getInvalidLevelDataType with valid input', async () => {
    const res = LevelUtil.getInvalidLevelDataType('Z');

    expect(res).toBe('Z');
  });
});

export {};
