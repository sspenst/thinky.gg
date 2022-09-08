import { NextApiResponse } from 'next';
import { ValidBlockMongoIDField, ValidEnum } from '../../../helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import User, { ReqUser } from '../../../models/db/user';
import { GraphModel } from '../../../models/mongoose';

export default withAuth({
  GET: {
    query: {
      id: ValidBlockMongoIDField.id,
      type: ValidEnum('follow')
    }
  },
  PUT: {
    body: {
      action: ValidEnum('follow', 'unfollow'), // @todo: in future, super_follow and super_unfollow
      targetType: ValidEnum('user', 'collection'),
      ...ValidBlockMongoIDField,
    }
  },
  DELETE: {
    body: {
      action: ValidEnum('follow', 'unfollow'), // @todo: in future, super_follow and super_unfollow
      targetType: ValidEnum('user', 'collection'),
      ...ValidBlockMongoIDField,
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { action, targetType, id } = req.body;
  const targetModel = targetType.charAt(0).toUpperCase() + targetType.slice(1);

  // @TODO: Check if user has blocked (future feature) to disallow following
  const query = {
    source: req.user._id,
    sourceModel: 'User',
    type: action,
    target: id,
    targetModel: targetModel,
  };

  if (req.method === 'GET') {
    const followerCount = await getFollowers(id, req.user);

    return res.json({ 'follow': followerCount });
  }
  else if (req.method === 'PUT') {
    await GraphModel.findOneAndUpdate(
      query
      ,
      query
      , {
        upsert: true,
        lean: true,
      });
  } else if (req.method === 'DELETE') {
    const edge = await GraphModel.deleteOne({
      query
    });

    if (edge.deletedCount === 0) {
      return res.status(404).json({
        error: 'Not following',
      });
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
