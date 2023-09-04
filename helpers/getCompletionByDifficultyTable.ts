import { getDifficultyList } from '@root/components/formatted/formattedDifficulty';
import { StatModel } from '@root/models/mongoose';
import { Types } from 'mongoose';

export async function getCompletionByDifficultyTable(userId: Types.ObjectId) {
  const difficultyList = getDifficultyList();
  const difficultyListValues = difficultyList.map((d) => d.value);

  const levelsCompletedByDifficultyData = await StatModel.aggregate([
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
        from: 'levels',
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
  ]);

  // map of difficulty value to levels completed
  const levelsCompletedByDifficulty: { [key: string]: number } = {};

  levelsCompletedByDifficultyData.map((d: {_id: string, count: number}) => {
    levelsCompletedByDifficulty[d._id] = d.count;
  });

  return levelsCompletedByDifficulty;
}
