import { PipelineStage, Types } from 'mongoose';
import { AchievementModel, CollectionModel, LevelModel, StatModel, UserModel } from '../models/mongoose';

export function getEnrichNotificationPipelineStages(reqUser?: Types.ObjectId) {
  const statEnrich = reqUser ? [
    // now enrich the target levels where userId: reqUser._id
    // TODO: would we ever have notification where we need the source to be a level and if so would we need to enrich that too?
    // Currently all sources are User so not wasting looking up users for target
    {
      $lookup: {
        from: StatModel.collection.name,
        let: { levelId: '$targetLevel._id', userId: reqUser._id },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$levelId', '$$levelId'] },
                  { $eq: ['$userId', '$$userId'] },
                ],
              },
            },
          },
        ],
        as: 'targetLevelStats',
      }
    },
    {
      $unwind: {
        path: '$targetLevelStats',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $set: {
        'targetLevel.userAttempts': '$targetLevelStats.attempts',
        'targetLevel.userMoves': '$targetLevelStats.moves',
        'targetLevel.userMovesTs': '$targetLevelStats.ts',
      },
    },
  ] : [];

  return [
    {
      $lookup: {
        from: AchievementModel.collection.name,
        localField: 'source',
        foreignField: '_id',
        as: 'sourceAchievement',
      },
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'source',
        foreignField: '_id',
        as: 'sourceLevel',
      },
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: 'source',
        foreignField: '_id',
        as: 'sourceUser',
      },
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'target',
        foreignField: '_id',
        as: 'targetLevel',
      },
    },
    {
      $lookup: {
        from: UserModel.collection.name,
        localField: 'target',
        foreignField: '_id',
        as: 'targetUser',
      },
    },
    {
      $lookup: {
        from: CollectionModel.collection.name,
        localField: 'target',
        foreignField: '_id',
        as: 'targetCollection',
      },
    },
    {
      $unwind: {
        path: '$sourceAchievement',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$sourceLevel',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$sourceUser',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$targetLevel',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$targetUser',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$targetCollection',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        createdAt: 1,
        message: 1,
        read: 1,
        sourceModel: 1,
        targetModel: 1,
        type: 1,
        updatedAt: 1,
        userId: 1,
        sourceAchievement: {
          _id: 1,
          type: 1,
          userId: 1,
        },
        sourceLevel: {
          _id: 1,
          leastMoves: 1,
          name: 1,
          slug: 1,
        },
        sourceUser: {
          _id: 1,
          avatarUpdatedAt: 1,
          hideStatus: 1,
          last_visited_at: 1,
          name: 1,
        },
        targetLevel: {
          _id: 1,
          leastMoves: 1,
          name: 1,
          slug: 1,
        },
        targetUser: {
          _id: 1,
          avatarUpdatedAt: 1,
          hideStatus: 1,
          last_visited_at: 1,
          name: 1,
        },
        targetCollection: {
          _id: 1,
          slug: 1,
          name: 1,
        },
      }
    },
    ...statEnrich,
    {
      // merge targetLevel and targetUser into target
      $addFields: {
        target: {
          $mergeObjects: [
            '$targetLevel',
            '$targetUser',
            '$targetCollection',
          ]
        },
        source: {
          $mergeObjects: [
            '$sourceAchievement',
            '$sourceLevel',
            '$sourceUser',
          ]
        }
      }
    },
    {
      $unset: [
        'sourceAchievement',
        'sourceLevel',
        'sourceUser',
        'targetLevel',
        'targetUser',
        'targetCollection',
        'targetLevelStats',
        'target.calc_playattempts_unique_users'
      ],
    },
  ] as PipelineStage[];
}
