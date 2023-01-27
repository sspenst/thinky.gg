import LevelDataType from '../../constants/levelDataType';

describe('constants/*.ts', () => {
  test('LevelDataType.toString()', async () => {
    const levelDataType = LevelDataType.toString();

    expect(levelDataType).toBeDefined();
    expect(Object.keys(levelDataType).length).toBe(20);
  });
  test('LevelDataType.isRaised()', async () => {
    expect(LevelDataType.isRaised(LevelDataType.Block)).toBeTruthy();
  });
  test('getInvalidLevelDataType with valid input', async () => {
    const res = LevelDataType.getInvalidLevelDataType('4');

    expect(res).toBeUndefined();
  });
  test('getInvalidLevelDataType with valid input', async () => {
    const res = LevelDataType.getInvalidLevelDataType('Z');

    expect(res).toBe('Z');
  });
});

export {};
