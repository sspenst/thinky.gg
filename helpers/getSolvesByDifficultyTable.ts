import { difficultyList } from '@root/components/formatted/formattedDifficulty';
import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import Level from '@root/models/db/level';
import { LevelModel, StatModel } from '@root/models/mongoose';
import { FilterQuery, SaveOptions, Types } from 'mongoose';
import { getGameFromId } from './getGameIdFromReq';

export async function getSolvesByDifficultyTable(
  gameId: GameId,
  userId: Types.ObjectId,
  options: SaveOptions = {},
  levelMatch: FilterQuery<Level> = {},
) {
  const difficultyListValues = difficultyList.map((d) => d.value);
  const game = getGameFromId(gameId);
  const difficultyField = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';

  const levelsSolvedByDifficultyData = await StatModel.aggregate([
    {
      $match: {
        userId: userId,
        ...(game.type === GameType.SHORTEST_PATH ? {
          complete: true,
        } : {}),
        isDeleted: { $ne: true },
        gameId: gameId,
      },
    },
    {
      $project: {
        _id: 0,
        levelId: 1,
      }
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelId',
        foreignField: '_id',
        as: 'levelInfo',
        pipeline: [
          {
            $match: {
              isDeleted: { $ne: true },
              isDraft: false,
              ...levelMatch,
            }
          },
          {
            $project: {
              _id: 0,
              calc_difficulty_completion_estimate: 1,
              calc_difficulty_estimate: 1,
            }
          }
        ]
      },
    },
    {
      $unwind: '$levelInfo',
    },
    {
      $bucket: {
        groupBy: `$levelInfo.${difficultyField}`,
        boundaries: difficultyListValues,
        default: difficultyListValues[difficultyListValues.length - 1],
        output: {
          count: { $sum: 1 }
        }
      },
    },
  ], options);

  // map of difficulty value to levels solved
  const levelsSolvedByDifficulty: { [key: string]: number } = {};

  levelsSolvedByDifficultyData.map((d: {_id: string, count: number}) => {
    levelsSolvedByDifficulty[d._id] = d.count;
  });

  return levelsSolvedByDifficulty;
}
