import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import { ValidObjectId } from '../../../helpers/apiWrapper';
import { enrichLevels } from '../../../helpers/enrich';
import { generateLevelSlug } from '../../../helpers/generateSlug';
import { logger } from '../../../helpers/logger';
import { clearNotifications } from '../../../helpers/notificationHelper';
import revalidateLevel from '../../../helpers/revalidateLevel';
import revalidateUrl, { RevalidatePaths } from '../../../helpers/revalidateUrl';
import cleanUser from '../../../lib/cleanUser';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import { CollectionModel, ImageModel, LevelModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserModel } from '../../../models/mongoose';
import { queueRefreshIndexCalcs } from '../internal-jobs/worker';

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

    const trimmedName = name.trim();
    // TODO: in extremely rare cases there could be a race condition, might need a transaction here
    const slug = await generateLevelSlug(req.user.name, trimmedName, id as string);

    const [level] = await Promise.all([
      LevelModel.findOneAndUpdate({
        _id: id,
        userId: req.userId,
      }, {
        $set: {
          authorNote: authorNote?.trim() ?? '',
          name: trimmedName,
          slug: slug,
        },
      }, {
        runValidators: true,
      }),
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
      queueRefreshIndexCalcs(new ObjectId(id as string))
    ]);

    // revalidate the old endpoint
    await revalidateLevel(res, level.slug);

    return res.status(200).json({ updated: true });
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    const level = await LevelModel.findById<Level>(id, {}, { lean: true });

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

    const record = await RecordModel.findOne<Record>({ levelId: id }).sort({ moves: 1 });

    // update calc_records if the record was set by a different user
    if (record && record.userId.toString() !== req.userId) {
      // NB: await to avoid multiple user updates in parallel
      await UserModel.updateOne({ _id: record.userId }, { $inc: { calc_records: -1 } });
    }

    const stats = await StatModel.find<Stat>({ levelId: id });
    const userIds = stats.filter(stat => stat.complete).map(stat => stat.userId);

    await Promise.all([
      ImageModel.deleteOne({ documentId: id }),
      LevelModel.deleteOne({ _id: id }),
      PlayAttemptModel.deleteMany({ levelId: id }),
      RecordModel.deleteMany({ levelId: id }),
      ReviewModel.deleteMany({ levelId: id }),
      StatModel.deleteMany({ levelId: id }),
      UserModel.updateMany({ _id: { $in: userIds } }, { $inc: { score: -1 } }),
      CollectionModel.updateMany({ levels: id }, { $pull: { levels: id } }),
    ]);

    // skip revalidation for draft levels
    if (level.isDraft) {
      return res.status(200).json({ updated: true });
    }

    try {
      const [revalidateCatalogRes, revalidateLevelRes] = await Promise.all([
        revalidateUrl(res, RevalidatePaths.CATALOG),
        revalidateLevel(res, level.slug),
      ]);

      /* istanbul ignore next */
      if (!revalidateCatalogRes) {
        throw new Error('Error revalidating catalog');
      } else if (!revalidateLevelRes) {
        throw new Error('Error revalidating level');
      } else {
        await clearNotifications(undefined, undefined, level._id);

        return res.status(200).json({ updated: true });
      }
    } catch (err) /* istanbul ignore next */ {
      logger.error(err);

      return res.status(500).json({
        error: 'Error revalidating api/level/[id] ' + err,
      });
    }
  }
});
