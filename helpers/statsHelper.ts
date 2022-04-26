import Level from '../models/db/level';
import SelectOptionStats from '../models/selectOptionStats';
import Stat from '../models/db/stat';
import { Types } from 'mongoose';
import User from '../models/db/user';
import World from '../models/db/world';

export default class StatsHelper {
  static creatorStats(
    creators: User[],
    creatorsToLevelIds: {[userId: string]: Types.ObjectId[]},
    stats: Stat[] | undefined,
  ) {
    const creatorStats: SelectOptionStats[] = [];

    for (let i = 0; i < creators.length; i++) {
      const levelIds = creatorsToLevelIds[creators[i]._id.toString()];

      if (!levelIds) {
        creatorStats.push(new SelectOptionStats(0, 0));
      } else if (!stats) {
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

  static worldStats(
    stats: Stat[] | undefined,
    worlds: World[],
    worldsToLevelIds: {[worldId: string]: Types.ObjectId[]},
  ) {
    const worldStats: SelectOptionStats[] = [];

    for (let i = 0; i < worlds.length; i++) {
      const levelIds = worldsToLevelIds[worlds[i]._id.toString()];

      if (!levelIds) {
        worldStats.push(new SelectOptionStats(0, 0));
      } else if (!stats) {
        worldStats.push(new SelectOptionStats(levelIds.length, undefined));
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

        worldStats.push(new SelectOptionStats(count, complete));
      }
    }
    
    return worldStats;
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
