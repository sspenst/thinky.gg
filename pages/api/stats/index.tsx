import { LevelModel, StatModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import { UserModel } from '../../../models/mongoose';
import crypto from 'crypto';
import dbConnect from '../../../lib/dbConnect';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();

    const stats = await StatModel.find({ userId: new ObjectId(req.userId) });

    return res.status(200).json(stats ?? []);
  } else if (req.method === 'PUT') {
    const id = crypto.randomUUID();
    console.time(id);

    const { levelId, moves } = req.body;

    await dbConnect();

    console.timeLog(id, 'connected to db');

    // NB: it's possible that in between retrieving the leastMoves and updating the user stats
    // a record leastMoves could have been set, which would make the complete/score properties inaccurate.
    // could use a transaction to ensure the data is accurate but Vercel seems to randomly hang when
    // calling startSession()
    const [{ leastMoves }, stat] = await Promise.all([
      LevelModel.findById(levelId, 'leastMoves'),
      StatModel.findOne({ levelId: levelId, userId: req.userId }),
    ]);

    if (!leastMoves) {
      return res.status(500).json({
        error: 'Error finding Level.leastMoves',
      });
    }

    console.timeLog(id, 'found leastMoves and stat');

    const complete = moves <= leastMoves;
    const promises = [];

    if (!stat) {
      // add the stat if it did not previously exist
      promises.push(StatModel.create({
        _id: new ObjectId(),
        complete: complete,
        levelId: new ObjectId(levelId),
        moves: moves,
        userId: new ObjectId(req.userId),
      }));

      if (complete) {
        promises.push(UserModel.updateOne({ _id: req.userId }, { $inc: { score: 1 } }));
      }
    } else if (moves < stat.moves) {
      // update stat if it exists and a new personal best is set
      promises.push(StatModel.updateOne({ _id: stat._id }, {
        $set: {
          complete: complete,
          moves: moves,
        },
      }));

      if (!stat.complete && complete) {
        promises.push(UserModel.updateOne({ _id: req.userId }, { $inc: { score: 1 } }));
      }
    }

    // if a new record was set
    if (moves < leastMoves) {
      // update level with new leastMoves data
      promises.push(LevelModel.updateOne({ _id: levelId }, {
        $set: {
          leastMoves: moves,
          leastMovesTs: Date.now(),
          leastMovesUserId: req.userId,
        },
      }));

      // find the userIds that need to be updated
      const stats = await StatModel.find({
        complete: true,
        levelId: new ObjectId(levelId),
        userId: { $ne: req.userId },
      }, 'userId');

      if (stats && stats.length > 0) {
        // update the stats
        promises.push(StatModel.updateMany({
          complete: true,
          levelId: new ObjectId(levelId),
          userId: { $ne: req.userId },
        }, { $set: { complete: false } }));

        // update all users that had a record on this level
        for (let i = 0; i < stats.length; i++) {
          promises.push(UserModel.updateOne({ _id: stats[i].userId }, { $inc: { score: -1 }}));
        }
      }
      
      // TODO: try adding these back once unstable_revalidate is improved
      // fetch(`${process.env.URI}/api/revalidate/level/${levelId}?secret=${process.env.REVALIDATE_SECRET}`);
      // fetch(`${process.env.URI}/api/revalidate/pack/${level.packId}?secret=${process.env.REVALIDATE_SECRET}`);

      console.timeLog(id, 'updating leastMoves');
    }

    await Promise.all(promises);
    console.timeEnd(id);

    // fetch(`${process.env.URI}/api/revalidate/leaderboard?secret=${process.env.REVALIDATE_SECRET}`);

    res.status(200).json({ success: true });
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
