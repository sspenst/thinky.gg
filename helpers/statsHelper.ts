import Level from '../models/db/level';
import Pack from '../models/db/pack';
import SelectOptionStats from '../models/selectOptionStats';
import Stat from '../models/db/stat';
import { Types } from 'mongoose';
import User from '../models/db/user';

export default class StatsHelper {
  static creatorStats(
    creators: User[],
    creatorsToLevelIds: {[userId: string]: Types.ObjectId[]},
    stats: Stat[] | undefined)
  {
    const creatorStats: SelectOptionStats[] = [];

    for (let i = 0; i < creators.length; i++) {
      const levelIds = creatorsToLevelIds[creators[i]._id.toString()];

      if (!stats) {
        creatorStats.push(new SelectOptionStats(levelIds.length, undefined));
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
  
        creatorStats.push(new SelectOptionStats(count, complete));
      }
    }
    
    return creatorStats;
  }

  static packStats(
    packs: Pack[],
    packsToLevelIds: {[packId: string]: Types.ObjectId[]},
    stats: Stat[] | undefined)
  {
    const packStats: SelectOptionStats[] = [];

    for (let i = 0; i < packs.length; i++) {
      const levelIds = packsToLevelIds[packs[i]._id.toString()];

      if (!stats) {
        packStats.push(new SelectOptionStats(levelIds.length, undefined));
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

        packStats.push(new SelectOptionStats(count, complete));
      }
    }
    
    return packStats;
  }

  static levelStats(
    levels: Level[],
    stats: Stat[] | undefined)
  {
    return levels.map(level => new SelectOptionStats(
      level.leastMoves,
      stats ? stats.find(stat => stat.levelId === level._id)?.moves : undefined
    ));
  }
}
