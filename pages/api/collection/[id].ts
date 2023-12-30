import isPro from '@root/helpers/isPro';
import { logger } from '@root/helpers/logger';
import { CollectionType } from '@root/models/constants/collection';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidObjectId, ValidObjectIdArray, ValidType } from '../../../helpers/apiWrapper';
import { generateCollectionSlug } from '../../../helpers/generateSlug';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import { CollectionModel } from '../../../models/mongoose';

type UpdateLevelParams = {
  authorNote?: string,
  isPrivate?: boolean,
  levels?: (string | Types.ObjectId)[],
  name?: string,
  slug?: string,
}

export default withAuth({
  PUT: {
    query: {
      id: ValidObjectId(),
    },
    body: {
      authorNote: ValidType('string', false),
      isPrivate: ValidType('boolean', false),
      levels: ValidObjectIdArray(false),
      name: ValidType('string', false),
    },
  },
  DELETE: {
    query: {
      id: ValidObjectId(),
    }
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'PUT') {
    const { id } = req.query;
    const { authorNote, isPrivate, name, levels } = req.body as UpdateLevelParams;
    const setIsPrivate = isPro(req.user) ? !!isPrivate : false;

    if (!authorNote && !name && !levels) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const session = await mongoose.startSession();
    let collection: Collection | null = null;
    let errorCode = 500, errorMessage = 'Error updating collection';

    try {
      await session.withTransaction(async () => {
        const collectionCurrent = await CollectionModel.findById(id, { userId: 1, type: 1 }, { session: session });

        if (!collectionCurrent) {
          errorCode = 404;
          errorMessage = 'Collection not found';
          throw new Error(errorMessage);
        }

        if (collectionCurrent.userId.toString() !== req.userId) {
          errorCode = 401;
          errorMessage = 'Not authorized to update this Collection';
          throw new Error(errorMessage);
        }

        if (collectionCurrent.type === CollectionType.PlayLater) {
          errorCode = 400;
          errorMessage = 'Cannot update Play Later collection';
          throw new Error(errorMessage);
        }

        const setObj: UpdateLevelParams = {
          isPrivate: setIsPrivate,
        };

        if (authorNote !== undefined) {
          setObj.authorNote = authorNote.trim();
        }

        if (levels) {
          setObj.levels = (levels as string[]).map(i => new Types.ObjectId(i));
        }

        if (name) {
          const trimmedName = name.trim();

          setObj.name = trimmedName;
          setObj.slug = await generateCollectionSlug(req.gameId, req.user.name, trimmedName, id as string, { session: session });

          if (setObj.slug.endsWith('/play-later')) {
            errorCode = 400;
            errorMessage = 'This uses a reserved word (play later). Please use another name for this collection.';
            throw new Error(errorMessage);
          }
        }

        collection = await CollectionModel.findOneAndUpdate({
          _id: id,
          userId: req.userId,
          // gameId unnecessary because we are querying by id
        }, {
          $set: setObj,
        }, {
          new: true,
          runValidators: true,
          session: session,
        });
      });

      session.endSession();
    } catch (err) /* istanbul ignore next 
// Newline placeholder needed for swc: https://github.com/swc-project/jest/issues/119#issuecomment-1872581999
*/ {
      logger.error(err);
      session.endSession();

      return res.status(errorCode).json({ error: errorMessage });
    }

    return res.status(200).json(collection);
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    const collection = await CollectionModel.findById<Collection>(id);

    if (!collection) {
      return res.status(404).json({
        error: 'Collection not found',
      });
    }

    if (collection.userId.toString() !== req.userId) {
      return res.status(401).json({
        error: 'Not authorized to delete this Collection',
      });
    }

    await CollectionModel.deleteOne({ _id: id });

    return res.status(200).json({ updated: true });
  }
});
