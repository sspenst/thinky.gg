import isFullAccount from '@root/helpers/isFullAccount';
import Collection from '@root/models/db/collection';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidType } from '../../../helpers/apiWrapper';
import { generateCollectionSlug } from '../../../helpers/generateSlug';
import { logger } from '../../../helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { CollectionModel } from '../../../models/mongoose';

export default withAuth({
  POST: {
    body: {
      authorNote: ValidType('string', false),
      isPrivate: ValidType('boolean', false),
      name: ValidType('string', true),
    }
  } }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!(await isFullAccount(req.user))) {
    return res.status(401).json({
      error: 'Creating a collection requires a full account with a confirmed email'
    });
  }

  const session = await mongoose.startSession();
  let collection: Collection | null = null;
  let errorCode = 500, errorMessage = 'Error creating collection';

  try {
    await session.withTransaction(async () => {
      const { authorNote, isPrivate, name } = req.body;
      const trimmedName = name.trim();
      const slug = await generateCollectionSlug(req.user.name, trimmedName, undefined, { session: session });

      if (slug == req.user.name + '/play-later') {
        errorCode = 400;
        errorMessage = 'This uses a reserved word (play later) which is a reserved word. Please use another name for this collection.';
        throw new Error(errorMessage); // can't just return res.status because we're in a transaction and will get a warning about headers being sent twice
      }

      collection = (await CollectionModel.create([{
        _id: new Types.ObjectId(),
        authorNote: authorNote?.trim(),
        isPrivate: !!isPrivate,
        name: trimmedName,
        slug: slug,
        userId: req.userId,
      }], { session: session }))[0];
    });

    session.endSession();
  } catch (err) /* istanbul ignore next */ {
    session.endSession();
    logger.error(err);

    return res.status(errorCode).json({ error: errorMessage });
  }

  return res.status(200).json(collection);
});
