import { difficultyList } from '@root/components/formatted/formattedDifficulty';
import { GameId } from '@root/constants/GameId';
import Level from '@root/models/db/level';
import { LevelModel } from '@root/models/mongoose';
import { FilterQuery, SaveOptions } from 'mongoose';

export async function getLevelsByDifficultyTable(
  gameId: GameId,
  levelMatch: FilterQuery<Level> = {},
  options: SaveOptions = {},
) {
  const difficultyListValues = difficultyList.map((d) => d.value);
  const levelsByDifficultyTable = await LevelModel.aggregate([
    {
      $match: {
        isDeleted: { $ne: true },
        isDraft: false,
        ...levelMatch,
        gameId: gameId,
      }
    },
    {
      $project: {
        _id: 0,
        calc_difficulty_estimate: 1
      }
    },
    {
      $bucket: {
        groupBy: '$calc_difficulty_estimate',
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

  levelsByDifficultyTable.map((d: {_id: string, count: number}) => {
    levelsSolvedByDifficulty[d._id] = d.count;
  });

  return levelsSolvedByDifficulty;
}
