import { ObjectId } from 'bson';
import getUniverseStats from '../../helpers/getUniverseStats';
import Stat from '../../models/db/stat';
import { UserWithLevels } from '../../pages/catalog/[index]';

describe('helpers/*.ts', () => {
  test('getUniverseStats', async () => {
    const levelId = new ObjectId();
    const stats = [
      {
        complete: true,
        levelId: levelId,
      },
    ] as Stat[];
    const usersWithLevels = [
      {
        levels: [levelId],
      },
      {
        levels: [new ObjectId()],
      },
      {
        levels: undefined,
      },
    ] as UserWithLevels[];

    let universeStats = getUniverseStats(undefined, usersWithLevels);

    expect(universeStats.length).toBe(3);
    expect(universeStats[0].userTotal).toBeUndefined();

    universeStats = getUniverseStats(stats, usersWithLevels);

    expect(universeStats.length).toBe(3);
    expect(universeStats[0].userTotal).toBe(1);
    expect(universeStats[1].userTotal).toBe(0);
    expect(universeStats[2].total).toBe(0);
    expect(universeStats[2].userTotal).toBe(0);
  });
});

export {};
