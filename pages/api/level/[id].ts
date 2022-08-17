import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import { enrichLevelsWithUserStats } from '../../../helpers/enrichLevelsWithUserStats';
import { logger } from '../../../helpers/logger';
import revalidateCatalog from '../../../helpers/revalidateCatalog';
import revalidateLevel from '../../../helpers/revalidateLevel';
import dbConnect from '../../../lib/dbConnect';
import getCollectionUserIds from '../../../lib/getCollectionUserIds';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import { CollectionModel, ImageModel, LevelModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserModel } from '../../../models/mongoose';
import { refreshIndexCalcs } from '../../../models/schemas/levelSchema';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  // NB: GET endpoint is for isDraft levels only
  // for published levels, use the level-by-slug API
  if (req.method === 'GET') {
    const { id } = req.query;

    await dbConnect();

    const level = await LevelModel.findOne({
      _id: id,
    }).populate('userId', 'name');

    if (!level) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    if (level.userId._id.toString() !== req.userId) {
      return res.status(401).json({
        error: 'Not authorized',
      });
    }

    if (!level.isDraft) {
      return res.status(401).json({
        error: 'This level is already published',
      });
    }

    const enrichedLevelArr = await enrichLevelsWithUserStats([level], req.user);
    const ret = enrichedLevelArr[0];

    return res.status(200).json(ret);
  } else if (req.method === 'PUT') {
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const { id } = req.query;

    // check if id is bson
    if (id && !ObjectId.isValid(id.toString())) {
      return res.status(400).json({
        error: 'Invalid level id',
      });
    }

    const { authorNote, collectionIds, name, points } = req.body;

    if (!name || points === undefined || !collectionIds) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    if (points < 0 || points > 10) {
      return res.status(400).json({
        error: 'Points must be a number between 0-10',
      });
    }

    await dbConnect();

    await Promise.all([
      LevelModel.updateOne({
        _id: id,
        userId: req.userId,
      }, {
        $set: {
          authorNote: authorNote,
          name: name,
          points: points,
        },
      }),
      CollectionModel.updateMany({
        _id: { $in: collectionIds },
        userId: { $in: getCollectionUserIds(req.user) },
      }, {
        $addToSet: {
          levels: id,
        },
      }),
      CollectionModel.updateMany({
        _id: { $nin: collectionIds },
        levels: id,
        userId: { $in: getCollectionUserIds(req.user) },
      }, {
        $pull: {
          levels: id,
        },
      }),
    ]);
    await refreshIndexCalcs(new ObjectId(id?.toString()));

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

    const record = await RecordModel.findOne<Record>({ levelId: id }).sort({ ts: -1 });

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
        revalidateCatalog(res),
        revalidateLevel(res, level.slug),
      ]);

      if (!revalidateCatalogRes) {
        throw 'Error revalidating catalog';
      } else if (!revalidateLevelRes) {
        throw 'Error revalidating level';
      } else {
        return res.status(200).json({ updated: true });
      }
    } catch (err) {
      logger.trace(err);

      return res.status(500).json({
        error: 'Error revalidating api/level/[id] ' + err,
      });
    }
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
