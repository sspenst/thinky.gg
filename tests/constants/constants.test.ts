import TileType from '@root/constants/tileType';
import TileTypeHelper from '@root/helpers/tileTypeHelper';

describe('constants/*.ts', () => {
  test('TileTypeHelper.isRaised()', async () => {
    expect(TileTypeHelper.isRaised(TileType.Block)).toBeTruthy();
  });
  test('getInvalidTileType with valid input', async () => {
    const res = TileTypeHelper.getInvalidTileType('4');

    expect(res).toBeUndefined();
  });
  test('getInvalidTileType with valid input', async () => {
    const res = TileTypeHelper.getInvalidTileType('?');

    expect(res).toBe('?');
  });
});

export {};
