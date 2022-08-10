import type { NextApiResponse } from 'next';
import Role from '../../../constants/role';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import { CollectionModel } from '../../../models/mongoose';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();

  let collections: Collection[];

  if (req.user.roles.includes(Role.CURATOR)) {
    collections = await CollectionModel.find<Collection>({ userId: { $in: [req.userId, undefined] } }).sort({ name: 1 });
  } else {
    collections = await CollectionModel.find<Collection>({ userId: req.userId }).sort({ name: 1 });
  }

  if (!collections) {
    return res.status(500).json({
      error: 'Error finding Collections',
    });
  }

  return res.status(200).json(collections);
});
