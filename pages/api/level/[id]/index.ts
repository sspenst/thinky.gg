import { createNewLevelAddedToCollectionNotification } from '@root/helpers/notificationHelper';
import Collection from '@root/models/db/collection';
import { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidObjectId } from '../../../../helpers/apiWrapper';
import { enrichLevels } from '../../../../helpers/enrich';
import { generateLevelSlug } from '../../../../helpers/generateSlug';
import isCurator from '../../../../helpers/isCurator';
import cleanUser from '../../../../lib/cleanUser';
import dbConnect from '../../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../../lib/withAuth';
import Level from '../../../../models/db/level';
import { CollectionModel, LevelModel } from '../../../../models/mongoose';
import { queueRefreshIndexCalcs } from '../../internal-jobs/worker';

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

    await dbConnect();

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
    const { authorNote, collectionIds, name } = req.body;

    if (!name || !collectionIds) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    await dbConnect();

    const level = await LevelModel.findById<Level>(id);

    if (!level) {
      return res.status(400).json({
        error: 'Level not found',
      });
    }

    const alreadyIn = await CollectionModel.find({
      _id: {
        $in: collectionIds,
      },
      userId: req.userId,
      levels: id,
    }, {
      _id: 1,
    }, {
      lean: true,
    });

    const alreadyInIds = alreadyIn.map((c: Collection) => c._id.toString());

    const notIn = collectionIds.filter((c: string) => !alreadyInIds.includes(c));

    const promises = [
      CollectionModel.updateMany({
        _id: { $in: collectionIds },
        userId: req.userId,
      }, {
        $addToSet: {
          levels: id,
        },
      }),
      CollectionModel.updateMany({
        _id: { $nin: collectionIds },
        levels: id,
        userId: req.userId,
      }, {
        $pull: {
          levels: id,
        },
      }),
      createNewLevelAddedToCollectionNotification(req.user, level, notIn),
      queueRefreshIndexCalcs(new Types.ObjectId(id as string))
    ];

    if (isCurator(req.user) || req.userId === level.userId.toString()) {
      const trimmedAuthorNote = authorNote?.trim() ?? '';
      const trimmedName = name.trim();
      // TODO: in extremely rare cases there could be a race condition, might need a transaction here
      const slug = await generateLevelSlug(level.slug.split('/')[0], trimmedName, id as string);

      promises.push(
        LevelModel.updateOne({
          _id: id,
        }, {
          $set: {
            authorNote: trimmedAuthorNote,
            name: trimmedName,
            slug: slug,
          },
        }, {
          runValidators: true,
        }),
      );

      // update level properties for return object
      level.authorNote = trimmedAuthorNote;
      level.name = trimmedName;
      level.slug = slug;
    }

    await Promise.all(promises);

    return res.status(200).json(level);
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    const level = await LevelModel.findOne<Level>({ _id: id, isDeleted: { $ne: true } }, {}, { lean: true });

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
