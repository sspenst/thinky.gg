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
import { getCollection } from '../collection-by-id/[id]';

type UpdateLevelParams = {
  authorNote?: string,
  isPrivate?: boolean,
  levels?: (string | Types.ObjectId)[],
  name?: string,
  private?: boolean,
  slug?: string,

}

export default withAuth({
  GET: {
    query: {
      id: ValidObjectId(),
    }
  },
  PUT: {
    query: {
      id: ValidObjectId(),
    },
    body: {
      authorNote: ValidType('string', false),
      isPrivate: ValidType('boolean', false),
      levels: ValidObjectIdArray(false),
      name: ValidType('string', false),
      privateFlag: ValidType('boolean', false), // naming is privateFlag instead of private because private is a reserved word
    },
  },
  DELETE: {
    query: {
      id: ValidObjectId(),
    }
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query;

    const collection = await getCollection({
      matchQuery: {
        _id: new Types.ObjectId(id as string),
        userId: req.user._id,
      },
      reqUser: req.user,
      includeDraft: true,
    });

    if (!collection) {
      return res.status(404).json({
        error: 'Error finding Collection',
      });
    }

    return res.status(200).json(collection);
  } else if (req.method === 'PUT') {
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
          throw new Error(errorMessage); // can't just return res.status because we're in a transaction and will get a warning about headers being sent twice
        }

        if (collectionCurrent.userId.toString() !== req.userId) {
          errorCode = 401;
          errorMessage = 'Not authorized to update this Collection';
          throw new Error(errorMessage); // can't just return res.status because we're in a transaction and will get a warning about headers being sent twice
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

        const trimmedName = name?.trim();

        if (trimmedName && collectionCurrent.type !== CollectionType.PlayLater) {
          setObj.name = trimmedName;
          setObj.slug = await generateCollectionSlug(req.user.name, trimmedName, id as string, { session: session });

          if (setObj.slug == req.user.name + '/play-later') {
            errorCode = 400;
            errorMessage = 'This uses a reserved word (play later) which is a reserved word. Please use another name for this collection.';
            throw new Error(errorMessage); // can't just return res.status because we're in a transaction and will get a warning about headers being sent twice
          }
        }

        collection = await CollectionModel.findOneAndUpdate({
          _id: id,
          userId: req.userId,
        }, {
          $set: setObj,
        }, {
          new: true,
          runValidators: true,
          session: session,
        });
      });

      session.endSession();
    } catch (err) /* istanbul ignore next */ {
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
