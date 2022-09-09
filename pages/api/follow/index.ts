import { NextApiResponse } from 'next';
import NotificationType from '../../../constants/notificationType';
import { ValidBlockMongoIDField, ValidEnum } from '../../../helpers/apiWrapper';
import { clearNotifications, createNewFollowerNotification } from '../../../helpers/notificationHelper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import User from '../../../models/db/user';
import { GraphModel } from '../../../models/mongoose';

export default withAuth({
  GET: {
    query: {
      ...ValidBlockMongoIDField
    }
  },
  PUT: {
    body: {
      action: ValidEnum('follow'), // @todo: in future, super_follow and super_unfollow
      targetType: ValidEnum('user', 'collection'),
      ...ValidBlockMongoIDField,
    }
  },
  DELETE: {
    body: {
      action: ValidEnum('follow'), // @todo: in future, super_follow and super_unfollow
      targetType: ValidEnum('user', 'collection'),
      ...ValidBlockMongoIDField,
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query;
    const followerData = await getFollowers(id as string, req.user);

    return res.json({
      'followerCount': followerData['followerCount'],
      'isFollowing': followerData['isFollowing'],
    });
  }

  const { action, targetType, id } = req.body;
  const targetModel = targetType.charAt(0).toUpperCase() + targetType.slice(1);

  // @TODO: Check if user has blocked (future feature) to disallow following
  const query = {
    source: req.userId,
    sourceModel: 'User',
    type: action,
    target: id,
    targetModel: targetModel,
  };

  if (req.method === 'PUT') {
    const followResponse = await GraphModel.updateOne(
      query
      ,
      query
      , {
        upsert: true,
        lean: true,
      });

    if (followResponse.upsertedCount === 1) {
      await createNewFollowerNotification(req.userId, id);
    }
  } else if (req.method === 'DELETE') {
    const edge = await GraphModel.deleteOne(
      query
    );

    if (edge.deletedCount === 0) {
      return res.status(400).json({
        error: 'Not following',
      });
    } else {
      await clearNotifications(undefined, req.user._id, id, NotificationType.NEW_FOLLOWER);
    }
  }

  const followerData = await getFollowers(id, req.user);

  return res.status(200).json(followerData);
});

export async function getFollowers(targetUser: string, reqUser?: User | null ) {
  const retObj: {followerCount: number, isFollowing?: boolean} = { followerCount: 0 };
  const followerCount = await GraphModel.countDocuments({
    target: targetUser,
    targetModel: 'User',
    type: 'follow',
  });

  retObj['followerCount'] = followerCount;

  if (reqUser) {
    const isFollowing = await GraphModel.countDocuments({
      source: reqUser._id,
      sourceModel: 'User',
      target: targetUser,
      targetModel: 'User',
      type: 'follow',
    });

    retObj['isFollowing'] = isFollowing > 0;
  }

  return retObj;
}
