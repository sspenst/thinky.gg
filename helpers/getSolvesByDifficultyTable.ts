import { difficultyList } from '@root/components/formatted/formattedDifficulty';
import { LevelModel, StatModel } from '@root/models/mongoose';
import { SaveOptions, Types } from 'mongoose';

export async function getSolvesByDifficultyTable(userId: Types.ObjectId, options: SaveOptions = {}) {
  const difficultyListValues = difficultyList.map((d) => d.value);
  const levelsSolvedByDifficultyData = await StatModel.aggregate([
    {
      $match: {
        userId: userId,
        complete: true,
        isDeleted: { $ne: true },
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
            }
          },
          {
            $project: {
              _id: 0,
              calc_difficulty_estimate: 1
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
        groupBy: '$levelInfo.calc_difficulty_estimate',
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
