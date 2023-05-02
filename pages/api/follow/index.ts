import { NextApiResponse } from 'next';
import GraphType from '../../../constants/graphType';
import NotificationType from '../../../constants/notificationType';
import { ValidEnum, ValidObjectId } from '../../../helpers/apiWrapper';
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

  // @TODO: Check if user has blocked (future feature) to disallow following
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
        error: 'Cannot follow yourself',
      });
    }

    const updateResult = await GraphModel.updateOne(query, query, {
      upsert: true,
      lean: true,
    });

    if (updateResult.upsertedCount === 1) {
      await createNewFollowerNotification(req.userId, id as string);
    }
  } else if (req.method === 'DELETE') {
    const deleteResult = await GraphModel.deleteOne(query);

    if (deleteResult.deletedCount === 0) {
      return res.status(400).json({
        error: 'Not following',
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
  const retObj: FollowData = { followerCount: 0 };

  retObj.followerCount = await GraphModel.countDocuments({
    target: targetUser,
    targetModel: 'User',
    type: GraphType.FOLLOW,
  });

  if (reqUser) {
    const isFollowing = await GraphModel.countDocuments({
      source: reqUser._id,
      sourceModel: 'User',
      target: targetUser,
      targetModel: 'User',
      type: GraphType.FOLLOW,
    });

    retObj.isFollowing = isFollowing > 0;
  }

  return retObj;
}
