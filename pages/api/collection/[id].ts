import { logger } from '@root/helpers/logger';
import mongoose, { PipelineStage, Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidObjectId, ValidObjectIdArray, ValidType } from '../../../helpers/apiWrapper';
import { enrichLevels } from '../../../helpers/enrich';
import { generateCollectionSlug } from '../../../helpers/generateSlug';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { CollectionModel } from '../../../models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

type UpdateLevelParams = {
  authorNote?: string,
  levels?: (string | Types.ObjectId)[],
  name?: string,
  slug?: string,
}

export async function getCollection(matchQuery: PipelineStage, reqUser: User | null, noDraftLevels = true) {
  await dbConnect();

  const levelsPipeline = [];

  if (noDraftLevels) {
    levelsPipeline.push({
      $match: {
        isDraft: false,
      }
    });
  }

  levelsPipeline.push(
    {
      $project: {
        ...LEVEL_DEFAULT_PROJECTION
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'userId',
        pipeline: [
          {
            $project: {
              ...USER_DEFAULT_PROJECTION
            }
          }
        ]
      }
    },
    {
      $unwind: {
        path: '$userId',
        preserveNullAndEmptyArrays: true,
      }
    },
  );

  const collectionAgg = await CollectionModel.aggregate<Collection>([
    {
      ...matchQuery,
    },
    {
      $lookup: {
        as: 'levelsPopulated',
        foreignField: '_id',
        from: 'levels',
        localField: 'levels',
        pipeline: levelsPipeline,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'userId',
        pipeline: [
          {
            $project: {
              ...USER_DEFAULT_PROJECTION
            }
          }
        ]
      }
    },
    {
      $unwind: {
        path: '$userId',
        preserveNullAndEmptyArrays: true,
      }
    },
  ]);

  if (collectionAgg.length !== 1) {
    return null;
  }

  const collection = collectionAgg[0];
  const levelMap = new Map<string, EnrichedLevel>();

  if (collection.levelsPopulated) {
    for (const level of collection.levelsPopulated) {
      levelMap.set(level._id.toString(), level);
    }

    collection.levels = collection.levels.map((level: EnrichedLevel) => {
      return levelMap.get(level._id.toString()) as EnrichedLevel;
    });
    // remove undefined levels
    collection.levels = collection.levels.filter((level: EnrichedLevel) => level !== undefined);
    collection.levelsPopulated = undefined;
  }

  const enrichedCollectionLevels = await enrichLevels(collection.levels, reqUser);
  const newCollection = JSON.parse(JSON.stringify(collection)) as Collection;

  newCollection.levels = enrichedCollectionLevels;

  return newCollection;
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
  if (req.method === 'GET') {
    const { id } = req.query;

    const collection = await getCollection({ $match: {
      _id: new Types.ObjectId(id as string),
      userId: req.user._id,
    } }, req.user, false);

    if (!collection) {
      return res.status(404).json({
        error: 'Error finding Collection',
      });
    }

    return res.status(200).json(collection);
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const { authorNote, name, levels } = req.body as UpdateLevelParams;

    if (!authorNote && !name && !levels) {
      res.status(400).json({ error: 'Missing required fields' });

      return;
    }

    const session = await mongoose.startSession();
    let collection: Collection | null = null;

    try {
      await session.withTransaction(async () => {
        const setObj: UpdateLevelParams = {};

        if (authorNote) {
          setObj.authorNote = authorNote.trim();
        }

        if (name) {
          const trimmedName = name.trim();

          setObj.name = trimmedName;
          setObj.slug = await generateCollectionSlug(req.user.name, trimmedName, id as string, { session: session });
        }

        if (levels) {
          setObj.levels = (levels as string[]).map(i => new Types.ObjectId(i));
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

      return res.status(500).json({ error: 'Error creating collection' });
    }

    if (!collection) {
      return res.status(401).json({ error: 'User is not authorized to perform this action' });
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
