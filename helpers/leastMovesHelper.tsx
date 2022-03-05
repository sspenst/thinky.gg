import Creator from '../models/data/pathology/creator';
import Level from '../models/data/pathology/level';
import Pack from '../models/data/pathology/pack';
import SelectOptionStats from '../models/selectOptionStats';

export default class LeastMovesHelper {
  static creatorStats(
    creators: Creator[],
    leastMovesObj: {[creatorId: string]: {[levelId: string]: number}},
    moves: {[levelId: string]: number} | undefined)
  {
    const stats: SelectOptionStats[] = [];

    for (let i = 0; i < creators.length; i++) {
      if (!moves) {
        stats.push(new SelectOptionStats(
          Object.keys(leastMovesObj[creators[i]._id]).length,
          undefined
        ));
      } else {
        const leastMovesCreator = leastMovesObj[creators[i]._id];
        let complete = 0;
        let count = 0;
  
        for (const [levelId, leastMoves] of Object.entries(leastMovesCreator)) {
          const bestMoves = moves[levelId];
  
          if (bestMoves && bestMoves <= leastMoves) {
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
    leastMovesObj: {[packId: string]: {[levelId: string]: number}},
    moves: {[levelId: string]: number} | undefined)
  {
    const stats: SelectOptionStats[] = [];

    for (let i = 0; i < packs.length; i++) {
      if (!moves) {
        stats.push(new SelectOptionStats(
          Object.keys(leastMovesObj[packs[i]._id]).length,
          undefined
        ));
      } else {
        const leastMovesPack = leastMovesObj[packs[i]._id];
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
    }
    
    return stats;
  }

  static levelStats(
    levels: Level[],
    moves: {[levelId: string]: number} | undefined)
  {
    const stats: SelectOptionStats[] = [];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      stats.push(new SelectOptionStats(
        level.leastMoves,
        moves ? moves[level._id] : undefined
      ));
    }

    return stats;
  }
}
