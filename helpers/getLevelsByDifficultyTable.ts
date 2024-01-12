import { difficultyList } from '@root/components/formatted/formattedDifficulty';
import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import Level from '@root/models/db/level';
import { LevelModel } from '@root/models/mongoose';
import { FilterQuery, SaveOptions } from 'mongoose';
import { getGameFromId } from './getGameIdFromReq';

export async function getLevelsByDifficultyTable(
  gameId: GameId,
  levelMatch: FilterQuery<Level> = {},
  options: SaveOptions = {},
) {
  const difficultyListValues = difficultyList.map((d) => d.value);
  const game = getGameFromId(gameId);
  const difficultyField = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_estimate_completion' : 'calc_difficulty_estimate';

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
        groupBy: `$${difficultyField}`,
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
