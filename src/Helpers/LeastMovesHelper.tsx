import Creator from '../DataModels/Pathology/Creator';
import Level from '../DataModels/Pathology/Level';
import LocalStorage from '../Models/LocalStorage';
import SelectOptionStats from '../Models/SelectOptionStats';

export default class LeastMovesHelper {
  static creatorStats(
    creators: Creator[],
    leastMovesObj: {[creatorId: string]: {[packId: string]: {[levelId: string]: number}}})
  {
    const stats: SelectOptionStats[] = [];

    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];
      const leastMovesCreator = leastMovesObj[creator._id];

      let complete = 0;
      let count = 0;

      const packIds = Object.keys(leastMovesCreator);
      const packStats = this.packStats(packIds, leastMovesCreator);

      for (let j = 0; j < packStats.length; j++) {
        const packStat = packStats[j];

        if (packStat.total === packStat.userTotal) {
          complete += 1;
        }
        
        count += 1;
      }

      stats.push(new SelectOptionStats(count, complete));
    }

    return stats;
  }

  static packStats(
    packIds: string[],
    leastMovesObj: {[packId: string]: {[levelId: string]: number}})
  {
    const stats: SelectOptionStats[] = [];

    for (let i = 0; i < packIds.length; i++) {
      const leastMovesPack = leastMovesObj[packIds[i]];

      let complete = 0;
      let count = 0;

      for (const [levelId, leastMoves] of Object.entries(leastMovesPack)) {
        const moves = LocalStorage.getLevelMoves(levelId);

        if (moves !== null && moves <= leastMoves) {
          complete += 1;
        }

        count += 1;
      }

      stats.push(new SelectOptionStats(count, complete));
    }
    
    return stats;
  }

  static levelStats(levels: Level[]) {
    const stats: SelectOptionStats[] = [];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const levelMoves = LocalStorage.getLevelMoves(level._id);

      stats.push(new SelectOptionStats(level.leastMoves, levelMoves));
    }

    return stats;
  }
}
