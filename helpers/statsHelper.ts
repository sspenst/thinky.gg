import Collection from '../models/db/collection';
import Level from '../models/db/level';
import Stat from '../models/db/stat';
import SelectOptionStats from '../models/selectOptionStats';
import { UserWithLevels } from '../pages/catalog/[index]';

export default class StatsHelper {
  static universeStats(
    stats: Stat[] | undefined,
    usersWithLevels: UserWithLevels[],
  ) {
    const universeStats: SelectOptionStats[] = [];

    for (let i = 0; i < usersWithLevels.length; i++) {
      const levelIds = usersWithLevels[i].levels;

      if (!levelIds) {
        universeStats.push(new SelectOptionStats(0, 0));
      } else if (!stats) {
        universeStats.push(new SelectOptionStats(levelIds.length, undefined));
      } else {
        let complete = 0;
        let count = 0;

        for (let i = 0; i < levelIds.length; i++) {
          const stat = stats.find(stat => stat.levelId === levelIds[i]);

          if (stat && stat.complete) {
            complete += 1;
          }

          count += 1;
        }

        universeStats.push(new SelectOptionStats(count, complete));
      }
    }

    return universeStats;
  }

  static collectionStats(
    collections: Collection[],
    stats: Stat[] | undefined,
  ) {
    const collectionStats: SelectOptionStats[] = [];

    for (let i = 0; i < collections.length; i++) {
      const levelIds = collections[i].levels.map(level => level._id);

      if (!levelIds) {
        collectionStats.push(new SelectOptionStats(0, 0));
      } else if (!stats) {
        collectionStats.push(new SelectOptionStats(levelIds.length, undefined));
      } else {
        let complete = 0;
        let count = 0;

        for (let i = 0; i < levelIds.length; i++) {
          const stat = stats.find(stat => stat.levelId === levelIds[i]);

          if (stat && stat.complete) {
            complete += 1;
          }

          count += 1;
        }

        collectionStats.push(new SelectOptionStats(count, complete));
      }
    }

    return collectionStats;
  }

  static levelStats(
    levels: Level[],
    stats: Stat[] | undefined,
  ) {
    return levels.map(level => new SelectOptionStats(
      level.leastMoves,
      stats ? stats.find(stat => stat.levelId === level._id)?.moves : undefined
    ));
  }
}
