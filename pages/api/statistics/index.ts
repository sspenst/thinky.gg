import type { NextApiRequest, NextApiResponse } from 'next';
import { UserWithCount } from '../../../components/statisticsTable';
import GraphType from '../../../constants/graphType';
import apiWrapper from '../../../helpers/apiWrapper';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import Review from '../../../models/db/review';
import User from '../../../models/db/user';
import { GraphModel, LevelModel, ReviewModel, StatModel, UserModel } from '../../../models/mongoose';
import Statistics from '../../../models/statistics';

export default apiWrapper({ GET: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const statistics = await getStatistics();

  if (!statistics) {
    return res.status(404).json({
      error: 'Error finding statistics',
    });
  }

  return res.status(200).json(statistics);
});

export async function getStatistics() {
  await dbConnect();

  const [
    currentlyOnlineCount,
    newUsers,
    registeredUsersCount,
    topFollowedUsers,
    topLevelCreators,
    topRecordBreakers,
    topReviewers,
    topScorers,
    totalAttempts,
    totalLevelsCount,
  ] = await Promise.all([
    getCurrentlyOnlineCount(),
    getNewUsers(),
    getRegisteredUsersCount(),
    getTopFollowedUsers(),
    getTopLevelCreators(),
    getTopRecordBreakers(),
    getTopReviewers(),
    getTopScorers(),
    getTotalAttempts(),
    getTotalLevelsCount(),
  ]);

  if (
    !newUsers ||
    !topFollowedUsers ||
    !topLevelCreators ||
    !topRecordBreakers ||
    !topReviewers ||
    !topScorers
  ) {
    return null;
  }

  return {
    currentlyOnlineCount: currentlyOnlineCount,
    newUsers: newUsers,
    registeredUsersCount: registeredUsersCount,
    topFollowedUsers: topFollowedUsers,
    topLevelCreators: topLevelCreators,
    topRecordBreakers: topRecordBreakers,
    topReviewers: topReviewers,
    topScorers: topScorers,
    totalAttempts: totalAttempts,
    totalLevelsCount: totalLevelsCount,
  } as Statistics;
}

async function getTopLevelCreators() {
  const agg = await LevelModel.aggregate([
    {
      $match: {
        isDraft: false,
      },
    },
    {
      $group: {
        _id: '$userId',
        count: { $sum: 1 },
      },
    },
    {
      // sort by count and then by id
      $sort: {
        count: -1,
        _id: 1,
      }
    },
    {
      $limit: 10,
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: '$user._id',
        name: '$user.name',
        last_visited_at: '$user.last_visited_at',
        ts: '$user.ts',
        avatarUpdatedAt: '$user.avatarUpdatedAt',
        score: '$count',
      }
    }
  ]);

  return await Promise.all(agg.map(async user => {
    cleanUser(user);

    return {
      ...user,
    } as User;
  }));
}

async function getTopFollowedUsers() {
  const agg = await GraphModel.aggregate([
    {
      $match: {
        type: GraphType.FOLLOW,
      },
    },
    {
      $group: {
        _id: '$target',
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        count: -1,
        _id: 1,
      }
    },
    {
      $limit: 10,
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: '$user._id',
        name: '$user.name',
        last_visited_at: '$user.last_visited_at',
        ts: '$user.ts',
        avatarUpdatedAt: '$user.avatarUpdatedAt',
        score: '$count',
      }
    }
  ]);

  return await Promise.all(agg.map(async user => {
    //const user = await UserModel.findById(item._id, {}, { lean: true });
    cleanUser(user);

    return {
      ...user,
    } as User;
  }
  ));
}

async function getTotalLevelsCount() {
  return await LevelModel.countDocuments({ isDraft: false });
}

async function getCurrentlyOnlineCount() {
  // active in the last 15 minutes
  return await UserModel.countDocuments({ last_visited_at: { $gt: TimerUtil.getTs() - 15 * 60 } });
}

async function getRegisteredUsersCount() {
  return await UserModel.countDocuments({ ts: { $exists: true } });
}

async function getTotalAttempts() {
  try {
    return (await StatModel.aggregate([
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: '$attempts' },
        },
      },
    ]))[0]?.totalAttempts as number || 0;
  } catch (err) {
    logger.error(err);

    return 0;
  }
}

async function getNewUsers() {
  try {
    const users = await UserModel.find<User>({}, {}, { lean: true, sort: { ts: -1 }, limit: 10 });

    users.forEach(user => cleanUser(user));

    return users;
  } catch (err) {
    logger.error(err);

    return null;
  }
}

async function getTopRecordBreakers() {
  try {
    const users = await UserModel.find<User>({
      score: { $ne: 0 },
      ts: { $exists: true },
    }, {}, {
      sort: { calc_records: -1 },
      limit: 10,
      lean: true,
    });

    users.forEach(user => cleanUser(user));

    return users;
  } catch (err) {
    logger.error(err);

    return null;
  }
}

async function getTopReviewers() {
  try {
    const topReviewers = await ReviewModel.aggregate<Review & {
      reviewCount: number;
      scoreCount: number;
      scoreTotal: number;
    }>([
      {
        $project: {
          hasScore: {
            $cond: [{ $gt: ['$score', 0] }, 1, 0]
          },
          score: 1,
          userId: 1,
        },
      },
      {
        $group: {
          _id: '$userId',
          reviewCount: { $sum: 1 },
          scoreCount: { $sum: '$hasScore' },
          scoreTotal: { $sum: '$score' },
        },
      },
      {
        $sort: { reviewCount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    const topReviewerIds = topReviewers.map(reviewer => reviewer._id);
    const topReviewersWithData = await UserModel.find<UserWithCount>({ _id: { $in: topReviewerIds } }, {}, { lean: true });

    // also need to append the count to the user
    topReviewersWithData.forEach(user => {
      const reviewer = topReviewers.find(reviewer => reviewer._id.toString() === user._id.toString());

      if (reviewer) {
        user.reviewCount = reviewer.reviewCount;
        user.reviewAvg = reviewer.scoreTotal / reviewer.scoreCount;
      }

      cleanUser(user);
    });

    topReviewersWithData.sort((a, b) => b.reviewCount - a.reviewCount);

    return topReviewersWithData;
  } catch (err) {
    logger.error(err);

    return null;
  }
}

async function getTopScorers() {
  try {
    const users = await UserModel.find<User>({
      score: { $ne: 0 },
      ts: { $exists: true },
    }, {}, {
      sort: { score: -1 },
      limit: 10,
      lean: true,
    });

    users.forEach(user => cleanUser(user));

    return users;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
