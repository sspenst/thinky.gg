import { UserModel } from '@root/models/mongoose';

/**
 * Counts the number of distinct users who have completed at least one level
 * (users with calcLevelsCompletedCount > 0 in any of their UserConfigs)
 *
 * @returns Promise<number> The count of users who completed at least one level
 */
export async function countUsersWhoCompletedOneLevel(): Promise<number> {
  const result = await UserModel.aggregate([
    {
      $lookup: {
        from: 'userconfigs',
        localField: '_id',
        foreignField: 'userId',
        as: 'configs',
      },
    },
    {
      $match: {
        'configs.calcLevelsCompletedCount': { $gt: 0 },
      },
    },
    {
      $group: {
        _id: '$_id',
      },
    },
    {
      $count: 'total',
    },
  ]);

  return result[0]?.total || 0;
}