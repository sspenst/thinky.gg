import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { CollectionModel } from '../../../models/mongoose';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import dbConnect from '../../../lib/dbConnect';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const { authorNote, name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    await dbConnect();

    const collection = await CollectionModel.create({
      _id: new ObjectId(),
      authorNote: authorNote,
      name: name,
      userId: req.userId,
    });

    return res.status(200).json(collection);
  } catch (err) {
    return res.status(500).json({
      error: 'Error creating collection',
    });
  }
});
