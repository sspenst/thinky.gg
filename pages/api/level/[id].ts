import { LevelModel, RecordModel, ReviewModel, StatModel, UserModel, WorldModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import type { NextApiResponse } from 'next';
import Stat from '../../../models/db/stat';
import World from '../../../models/db/world';
import dbConnect from '../../../lib/dbConnect';
import revalidateUniverse from '../../../helpers/revalidateUniverse';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query;

    await dbConnect();

    const level = await LevelModel.findOne({
      _id: id,
      userId: req.userId,
    }).populate<{worldId: World}>('worldId', '_id name');

    if (!level) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    res.status(200).json(level);
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const { authorNote, name, points, worldId } = req.body;

    if (points < 0 || points > 10) {
      return res.status(400).json({
        error: 'Points must a number between 0-10',
      });
    }

    await dbConnect();

    const world = await WorldModel.findById<World>(worldId);

    if (!world) {
      return res.status(404).json({
        error: 'World not found',
      });
    }

    if (world.userId.toString() !== req.userId) {
      return res.status(401).json({
        error: 'Not authorized to add a level to this World',
      });
    }

    await Promise.all([
      LevelModel.updateOne({
        _id: id,
        userId: req.userId,
      }, {
        $set: {
          authorNote: authorNote,
          name: name,
          points: points,
          worldId: worldId,
        },
      }),
      // add the level to the world if it doesn't already exist
      WorldModel.updateOne({
        _id: worldId,
      }, {
        $addToSet: {
          levels: id,
        },
      }),
    ]);

    res.status(200).json({ success: true });
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
      WorldModel.updateMany({ levels: level._id }, { $pull: { levels: level._id } }),
    ]);

    await revalidateUniverse(req, res);
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
