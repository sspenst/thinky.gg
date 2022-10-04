import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import { ValidType } from '../../../helpers/apiWrapper';
import { generateCollectionSlug } from '../../../helpers/generateSlug';
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
    const trimmedName = name.trim();
    // TODO: in extremely rare cases there could be a race condition, might need a transaction here
    const slug = await generateCollectionSlug(req.user.name, trimmedName);
    const collection = await CollectionModel.create({
      _id: new ObjectId(),
      authorNote: authorNote?.trim(),
      name: trimmedName,
      slug: slug,
      userId: req.userId,
    });

    return res.status(200).json(collection);
  } catch (err) /* istanbul ignore next */ {
    logger.error(err);

    return res.status(500).json({
      error: 'Error creating collection',
    });
  }
});
