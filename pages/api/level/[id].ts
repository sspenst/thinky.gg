import { LevelModel, RecordModel, ReviewModel, StatModel, UserModel, WorldModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import type { NextApiResponse } from 'next';
import Stat from '../../../models/db/stat';
import dbConnect from '../../../lib/dbConnect';
import revalidateUniverse from '../../../helpers/revalidateUniverse';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query;

    await dbConnect();

    const level = await LevelModel.findOne({
      _id: id,
      userId: req.userId,
    });

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
        error: 'Points must a number between 0-10',
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

    return await revalidateUniverse(req, res, false);
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

    const stats = await StatModel.find<Stat>({ levelId: id });
    const userIds = stats.filter(stat => stat.complete).map(stat => stat.userId);

    await Promise.all([
      LevelModel.deleteOne({ _id: id }),
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

    return await revalidateUniverse(req, res);
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
