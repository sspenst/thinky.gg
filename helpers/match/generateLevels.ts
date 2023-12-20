import { DIFFICULTY_INDEX, getDifficultyRangeByIndex } from '@root/components/formatted/formattedDifficulty';
import { GameId } from '@root/constants/GameId';
import Level from '@root/models/db/level';
import { LevelModel } from '@root/models/mongoose';

/**
 *
 * @param minDifficultyIndex
 * @param maxDifficultyIndex Pass the same value as min to make it a single difficulty
 * @param levelCount
 * @returns
 */

export async function generateLevels(
  gameId: GameId,
  minDifficultyIndex: DIFFICULTY_INDEX,
  maxDifficultyIndex: DIFFICULTY_INDEX,
  options: {
    minSteps?: number;
    maxSteps?: number;
    minLaplace?: number;
    minReviews?: number;
    maxWidth?: number;
    maxHeight?: number;
  },
  levelCount: number
) {
  // generate a new level based on criteria...
  const MIN_STEPS = options.minSteps || 8;
  const MAX_STEPS = options.maxSteps || 100;
  const MAX_WIDTH = options.maxWidth || 25;
  const MAX_HEIGHT = options.maxHeight || 25;
  const MIN_REVIEWS = options.minReviews || 3;
  const MIN_LAPLACE = options.minLaplace || 0.3;
  const [minDifficultyRange] = getDifficultyRangeByIndex(minDifficultyIndex);
  const [, maxDifficultyRange] = getDifficultyRangeByIndex(maxDifficultyIndex);

  const levels = await LevelModel.aggregate<Level>([
    {
      $match: {
        isDeleted: { $ne: true },
        isDraft: false,
        gameId: gameId,
        leastMoves: {
          // least moves between 10 and 100
          $gte: MIN_STEPS,
          $lte: MAX_STEPS,
        },
        calc_difficulty_estimate: {
          $gte: minDifficultyRange,
          $lt: maxDifficultyRange,
          $exists: true,
        },
        calc_reviews_count: {
          // at least 3 reviews
          $gte: MIN_REVIEWS,
        },
        calc_reviews_score_laplace: {
          $gte: MIN_LAPLACE,
        },
        width: {
          $lte: MAX_WIDTH,
        },
        height: {
          $lte: MAX_HEIGHT,
        },
      },
    },
    {
      $addFields: {
        tmpOrder: { $rand: {} },
      },
    },
    {
      $sort: {
        tmpOrder: 1,
      },
    },
    {
      $limit: levelCount,
    },
    {
      $sort: {
        calc_difficulty_estimate: 1,
      },
    },
    {
      $project: {
        _id: 1,
        leastMoves: 1
      },
    },
  ]);

  return levels;
}
