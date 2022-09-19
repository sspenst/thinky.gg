import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import { ValidType } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { CollectionModel } from '../../../models/mongoose';

export default withAuth({
  POST: {
    body: {
      name: ValidType('string', true),
      authorNote: ValidType('string', false),
    }
  } }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  try {
    const { authorNote, name } = req.body;

    await dbConnect();

    const collection = await CollectionModel.create({
      _id: new ObjectId(),
      authorNote: authorNote?.trim(),
      name: name.trim(),
      userId: req.userId,
    });

    return res.status(200).json(collection);
  } catch (err) {
    logger.error(err);

    return res.status(500).json({
      error: 'Error creating collection',
    });
  }
});
