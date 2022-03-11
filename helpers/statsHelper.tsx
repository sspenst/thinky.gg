import Creator from '../models/data/pathology/creator';
import Level from '../models/data/pathology/level';
import Pack from '../models/data/pathology/pack';
import SelectOptionStats from '../models/selectOptionStats';
import User from '../models/data/pathology/user';

export default class StatsHelper {
  static creatorStats(
    creators: Creator[],
    creatorsToLevelIds: {[creatorId: string]: string[]},
    user: User | undefined)
  {
    const stats: SelectOptionStats[] = [];

    for (let i = 0; i < creators.length; i++) {
      const levelIds = creatorsToLevelIds[creators[i]._id.toString()];

      if (!user) {
        stats.push(new SelectOptionStats(levelIds.length, undefined));
      } else if (!user.stats) {
        stats.push(new SelectOptionStats(levelIds.length, 0));
      } else {
        let complete = 0;
        let count = 0;
  
        for (let i = 0; i < levelIds.length; i++) {
          const stats = user.stats[levelIds[i]];

          if (stats && stats.complete) {
            complete += 1;
          }
  
          count += 1;
        }
  
        stats.push(new SelectOptionStats(count, complete));
      }
    }
    
    return stats;
  }

  static packStats(
    packs: Pack[],
    packsToLevelIds: {[packId: string]: string[]},
    user: User | undefined)
  {
    const stats: SelectOptionStats[] = [];

    for (let i = 0; i < packs.length; i++) {
      const levelIds = packsToLevelIds[packs[i]._id.toString()];

      if (!user) {
        stats.push(new SelectOptionStats(levelIds.length, undefined));
      } else if (!user.stats) {
        stats.push(new SelectOptionStats(levelIds.length, 0));
      } else {
        let complete = 0;
        let count = 0;
  
        for (let i = 0; i < levelIds.length; i++) {
          const stats = user.stats[levelIds[i]];

          if (stats && stats.complete) {
            complete += 1;
          }
  
          count += 1;
        }

        stats.push(new SelectOptionStats(count, complete));
      }
    }
    
    return stats;
  }

  static levelStats(
    levels: Level[],
    user: User | undefined)
  {
    return levels.map(level => new SelectOptionStats(
      level.leastMoves,
      user?.stats ? user.stats[level._id.toString()]?.moves : undefined
    ));
  }
}
