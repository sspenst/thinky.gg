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
      name: ValidType('string', true),
      authorNote: ValidType('string', false),
      private: ValidType('boolean', false),
    }
  } }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!(await isFullAccount(req.user))) {
    return res.status(401).json({
      error: 'Creating a collection requires a full account with a confirmed email'
    });
  }

  const session = await mongoose.startSession();
  let collection: Collection | null = null;

  try {
    await session.withTransaction(async () => {
      const { authorNote, name, private:privateFlag } = req.body;
      const trimmedName = name.trim();
      const slug = await generateCollectionSlug(req.user.name, trimmedName, undefined, { session: session });
      if (slug == req.user.name+'/play-later') {
        return res.status(400).json({ error: 'This uses a reserved word (play later) which is a reserved word. Please use another name for this collection.' });
      }
      collection = (await CollectionModel.create([{
        _id: new Types.ObjectId(),
        authorNote: authorNote?.trim(),
        name: trimmedName,
        slug: slug,
        private: privateFlag,
        userId: req.userId,
      }], { session: session }))[0];
    });

    session.endSession();
  } catch (err) /* istanbul ignore next */ {
    logger.error(err);
    session.endSession();

    return res.status(500).json({ error: 'Error creating collection' });
  }

  return res.status(200).json(collection);
});
