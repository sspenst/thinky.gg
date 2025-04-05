import { NextApiResponse } from 'next';
import GraphType from '../../../constants/graphType';
import NotificationType from '../../../constants/notificationType';
import { ValidEnum, ValidObjectId } from '../../../helpers/apiWrapper';
import { getBlockedUserIds } from '../../../helpers/getBlockedUserIds';
import { clearNotifications, createNewFollowerNotification } from '../../../helpers/notificationHelper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import User from '../../../models/db/user';
import { GraphModel } from '../../../models/mongoose';

export default withAuth({
  GET: {
    query: {
      id: ValidObjectId(),
    }
  },
  PUT: {
    query: {
      action: ValidEnum(Object.values(GraphType)),
      id: ValidObjectId(),
      targetModel: ValidEnum(['User', 'Collection']),
    }
  },
  DELETE: {
    query: {
      action: ValidEnum(Object.values(GraphType)),
      id: ValidObjectId(),
      targetModel: ValidEnum(['User', 'Collection']),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query;
    const followData = await getFollowData(id as string, req.user);

    return res.json(followData);
  }

  const { action, id, targetModel } = req.query;

  // Create the query for graph operations
  const query = {
    source: req.userId,
    sourceModel: 'User',
    type: action,
    target: id,
    targetModel: targetModel,
  };

  if (req.method === 'PUT') {
    if (req.userId === id) {
      return res.status(400).json({
        error: `Cannot ${action?.toString().toLowerCase()} yourself`,
      });
    }

    // For FOLLOW action, check if the target user is blocked
    if (action === GraphType.FOLLOW && targetModel === 'User') {
      const blockedUserIds = await getBlockedUserIds(req.userId);

      if (blockedUserIds.includes(id as string)) {
        return res.status(400).json({
          error: 'Cannot follow a blocked user',
        });
      }
    }

    // For BLOCK action, automatically unfollow the user
    if (action === GraphType.BLOCK && targetModel === 'User') {
      // Remove any follow connection from current user to the blocked user
      await GraphModel.deleteOne({
        source: req.userId,
        sourceModel: 'User',
        type: GraphType.FOLLOW,
        target: id,
        targetModel: 'User',
      });
    }

    const updateResult = await GraphModel.updateOne(query, query, {
      upsert: true,
    }).lean();

    if (updateResult.upsertedCount === 1) {
      await createNewFollowerNotification(req.gameId, req.userId, id as string);
    }
  } else if (req.method === 'DELETE') {
    const deleteResult = await GraphModel.deleteOne(query);

    if (deleteResult.deletedCount === 0) {
      return res.status(400).json({
        error: `Not ${action?.toString().toLowerCase()}ing`,
      });
    } else {
      await clearNotifications(undefined, req.user._id, id as string, NotificationType.NEW_FOLLOWER);
    }
  }

  const followData = await getFollowData(id as string, req.user);

  return res.status(200).json(followData);
});

export interface FollowData {
  followerCount: number;
  isFollowing?: boolean;
}

export async function getFollowData(targetUser: string, reqUser?: User | null) {
  const [followerCount, isFollowing] = await Promise.all([
    GraphModel.countDocuments({
      target: targetUser,
      targetModel: 'User',
      type: GraphType.FOLLOW,
    }),
    reqUser ? GraphModel.countDocuments({
      source: reqUser._id,
      sourceModel: 'User',
      target: targetUser,
      targetModel: 'User',
      type: GraphType.FOLLOW,
    }) : Promise.resolve(0)
  ]);

  return {
    followerCount,
    ...(reqUser && { isFollowing: isFollowing > 0 })
  } as FollowData;
}
