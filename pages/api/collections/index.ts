import { ValidObjectId } from '@root/helpers/apiWrapper';
import { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { CollectionWithLevel } from '../../../models/db/collection';
import { CollectionModel } from '../../../models/mongoose';

export default withAuth({
  GET: {
    query: {
      id: ValidObjectId(false),
    },
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const { id } = req.query;

  const collections = await CollectionModel.aggregate<CollectionWithLevel>([
    {
      $match: {
        userId: req.user._id,
      },
    },
    {
      $addFields: {
        containsLevel: {
          $in: [new Types.ObjectId(id as string), '$levels'],
        },
      },
    },
    {
      $sort: {
        name: 1,
      },
    },
    {
      $project: {
        _id: 1,
        containsLevel: 1,
        isPrivate: 1,
        name: 1,
      },
    },
  ]);

  return res.status(200).json(collections);
});
