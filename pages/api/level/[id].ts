import { ImageModel, LevelModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserModel, WorldModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import type { NextApiResponse } from 'next';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import dbConnect from '../../../lib/dbConnect';
import revalidateLevel from '../../../helpers/revalidateLevel';
import revalidateUniverse from '../../../helpers/revalidateUniverse';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query;

    await dbConnect();

    const level = await LevelModel.findOne({
      _id: id,
      userId: req.userId,
    }).populate('userId', 'name');

    if (!level) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    return res.status(200).json(level);
  } else if (req.method === 'PUT') {
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const { id } = req.query;
    const { authorNote, name, points, worldIds } = req.body;

    if (!name || points === undefined || !worldIds) {
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
      WorldModel.updateMany({
        _id: { $in: worldIds },
        userId: req.userId,
      }, {
        $addToSet: {
          levels: id,
        },
      }),
      WorldModel.updateMany({
        _id: { $nin: worldIds },
        levels: id,
        userId: req.userId,
      }, {
        $pull: {
          levels: id,
        },
      }),
    ]);

    try {
      const revalidateRes = await revalidateUniverse(req, false);

      if (revalidateRes.status !== 200) {
        throw await revalidateRes.text();
      } else {
        return res.status(200).json({ updated: true });
      }
    } catch (err) {
      console.trace(err);

      return res.status(500).json({
        error: 'Error revalidating api/level/[id] ' + err,
      });
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    const level = await LevelModel.findById<Level>(id);

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
      WorldModel.updateMany({ levels: id }, { $pull: { levels: id } }),
    ]);

    // skip revalidation for draft levels
    if (level.isDraft) {
      return res.status(200).json({ updated: true });
    }

    try {
      const [revalidateUniverseRes, revalidateLevelRes] = await Promise.all([
        revalidateUniverse(req),
        revalidateLevel(req, level.slug),
      ]);

      if (revalidateUniverseRes.status !== 200) {
        throw await revalidateUniverseRes.text();
      } else if (revalidateLevelRes.status !== 200) {
        throw await revalidateLevelRes.text();
      } else {
        return res.status(200).json({ updated: true });
      }
    } catch (err) {
      console.trace(err);

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
