import type { NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import getCollectionUserIds from '../../../lib/getCollectionUserIds';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import { CollectionModel } from '../../../models/mongoose';

export default withAuth({ methods: ['GET'] }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  await dbConnect();

  const collections = await CollectionModel.find<Collection>({ userId: { $in: getCollectionUserIds(req.user) } }).sort({ name: 1 });

  if (!collections) {
    return res.status(404).json({
      error: 'Error finding Collections',
    });
  }

  return res.status(200).json(collections);
});
