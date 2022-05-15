import { LevelModel, RecordModel, ReviewModel, StatModel, UserModel, WorldModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import type { NextApiResponse } from 'next';
import Stat from '../../../models/db/stat';
import World from '../../../models/db/world';
import dbConnect from '../../../lib/dbConnect';
import revalidateUniverse from '../../../helpers/revalidateUniverse';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'PUT') {
    const { id } = req.query;
    const { authorNote, name } = req.body;
  
    await dbConnect();

    await WorldModel.updateOne({
      _id: id,
      userId: req.userId,
    }, {
      $set: {
        authorNote: authorNote,
        name: name,
      },
    });

    await revalidateUniverse(req, res);
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    const world = await WorldModel.findById<World>(id);

    if (!world) {
      return res.status(404).json({
        error: 'World not found',
      });
    }

    if (world.userId.toString() !== req.userId) {
      return res.status(401).json({
        error: 'Not authorized to delete this World',
      });
    }

    const levelIds = (await LevelModel.find<Level>({ worldId: id })).map(level => level._id);
    const stats = await StatModel.find<Stat>({ levelId: { $in: levelIds }});

    // user scores that need to be adjusted after deleting levels
    const scoreInc: {[userId: string]: number} = {};

    for (let i = 0; i < stats.length; i++) {
      if (stats[i].complete) {
        const userId = stats[i].userId.toString();
        scoreInc[userId] = (scoreInc[userId] || 0) - 1;
      }
    }

    const promises: unknown[] = [
      LevelModel.deleteMany({ worldId: id }),
      RecordModel.deleteMany({ levelId: { $in: levelIds }}),
      ReviewModel.deleteMany({ levelId: { $in: levelIds }}),
      StatModel.deleteMany({ levelId: { $in: levelIds }}),
      WorldModel.deleteOne({ _id: id }),
    ];

    for (const userId in scoreInc) {
      promises.push(UserModel.updateOne({ _id: userId }, { $inc: { score: scoreInc[userId] }}));
    }

    await Promise.all(promises);

    res.status(200).json({ success: true });
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
