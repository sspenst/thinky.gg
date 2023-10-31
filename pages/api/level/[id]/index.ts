import { logger } from '@root/helpers/logger';
import mongoose from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidObjectId } from '../../../../helpers/apiWrapper';
import { enrichLevels } from '../../../../helpers/enrich';
import { generateLevelSlug } from '../../../../helpers/generateSlug';
import isCurator from '../../../../helpers/isCurator';
import cleanUser from '../../../../lib/cleanUser';
import withAuth, { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Level from '../../../../models/db/level';
import { CollectionModel, LevelModel } from '../../../../models/mongoose';

export default withAuth({
  GET: {
    query: {
      id: ValidObjectId(true),
    },
  },
  PUT: {
    query: {
      id: ValidObjectId(true),
    },
  },
  DELETE: {
    query: {
      id: ValidObjectId(true),
    },
  }
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  // NB: GET endpoint is for isDraft levels only
  // for published levels, use the level-by-slug API
  if (req.method === 'GET') {
    const { id } = req.query;

    const level = await LevelModel.findOne({
      _id: id,
      userId: req.userId,
    }).populate('userId');

    if (!level) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    cleanUser(level.userId);

    if (!level.isDraft) {
      return res.status(401).json({
        error: 'This level is already published',
      });
    }

    const enrichedLevelArr = await enrichLevels([level], req.user);
    const ret = enrichedLevelArr[0];

    return res.status(200).json(ret);
  } else if (req.method === 'PUT') {
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const { id } = req.query;
    const { authorNote, name } = req.body;
    const trimmedName = name?.trim();

    if (!trimmedName) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const level = await LevelModel.findById<Level>(id);

    if (!level) {
      return res.status(400).json({
        error: 'Level not found',
      });
    }

    if (isCurator(req.user) || req.userId === level.userId.toString()) {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const trimmedAuthorNote = authorNote?.trim() ?? '';

          const slug = await generateLevelSlug(level.slug.split('/')[0], trimmedName, id as string, { session: session });

          await LevelModel.updateOne({
            _id: id,
          }, {
            $set: {
              authorNote: trimmedAuthorNote,
              name: trimmedName,
              slug: slug,
            },
          }, {
            runValidators: true,
            session: session,
          });

          // update level properties for return object
          level.authorNote = trimmedAuthorNote;
          level.name = trimmedName;
          level.slug = slug;
        });

        session.endSession();
      } catch (err) {
        logger.error(err);
        session.endSession();

        return res.status(500).json({
          error: `Error updating slug for level id ${level._id.toString()}`,
        });
      }
    }

    return res.status(200).json(level);
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    const level = await LevelModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean<Level>();

    if (!level) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    if (level.userId.toString() !== req.userId) {
      return res.status(401).json({
        error: 'Not authorized to delete this Level',
      });
    }

    if (!level.isDraft) {
      return res.status(401).json({
        error: 'Unpublish this level before deleting',
      });
    }

    await Promise.all([
      LevelModel.updateOne({ _id: id }, { $set: { isDeleted: true, slug: id } }),
      CollectionModel.updateMany({ levels: id }, { $pull: { levels: id } }),
    ]);

    return res.status(200).json({ updated: true });
  }
});
