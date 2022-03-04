import Creator from '../models/data/pathology/creator';
import Level from '../models/data/pathology/level';
import SelectOptionStats from '../models/selectOptionStats';

export default class LeastMovesHelper {
  static creatorStats(
    creators: Creator[],
    leastMovesObj: {[creatorId: string]: {[packId: string]: {[levelId: string]: number}}},
    moves: {[levelId: string]: number})
  {
    const stats: SelectOptionStats[] = [];

    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];
      const leastMovesCreator = leastMovesObj[creator._id];

      let total = 0;
      let userTotal = 0;

      const packIds = Object.keys(leastMovesCreator);
      const packStats = this.packStats(packIds, leastMovesCreator, moves);

      for (let j = 0; j < packStats.length; j++) {
        const packStat = packStats[j];

        total += packStat.total;
        userTotal += packStat.userTotal ? packStat.userTotal : 0;
      }

      stats.push(new SelectOptionStats(total, userTotal));
    }

    return stats;
  }

  static packStats(
    packIds: string[],
    leastMovesObj: {[packId: string]: {[levelId: string]: number}},
    moves: {[levelId: string]: number})
  {
    const stats: SelectOptionStats[] = [];

    for (let i = 0; i < packIds.length; i++) {
      const leastMovesPack = leastMovesObj[packIds[i]];

      let complete = 0;
      let count = 0;

      for (const [levelId, leastMoves] of Object.entries(leastMovesPack)) {
        const bestMoves = moves[levelId];

        if (bestMoves && bestMoves <= leastMoves) {
          complete += 1;
        }

        count += 1;
      }

      stats.push(new SelectOptionStats(count, complete));
    }
    
    return stats;
  }

  static levelStats(
    levels: Level[],
    moves: {[levelId: string]: number})
  {
    const stats: SelectOptionStats[] = [];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      stats.push(new SelectOptionStats(level.leastMoves, moves[level._id]));
    }

    return stats;
  }
}
