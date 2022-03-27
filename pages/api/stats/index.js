import { LevelModel, StatModel } from '../../../models/mongoose';
import { ObjectId } from 'bson';
import { UserModel } from '../../../models/mongoose';
import crypto from 'crypto';
import dbConnect from '../../../lib/dbConnect';
import withAuth from '../../../lib/withAuth';

async function handler(req, res) {
  if (req.method === 'GET') {
    await dbConnect();

    const stats = await StatModel.find({ userId: new ObjectId(req.userId) });

    return res.status(200).json(stats ?? []);
  } else if (req.method === 'PUT') {
    const id = crypto.randomUUID();
    console.time(id);

    const { levelId, moves } = req.body;

    const connection = await dbConnect();

    console.timeLog(id, 'connected to db');

    const session = await connection.startSession();

    console.timeLog(id, 'started session');

    try {
      // NB: using a transaction because it's possible that in between retrieving the leastMoves and updating the
      // user stats a record leastMoves could have been set, which would make the complete/score properties inaccurate
      await session.withTransaction(async () => {
        const [{ leastMoves }, stat] = await Promise.all([
          LevelModel.findById(levelId, 'leastMoves').session(session).lean(),
          StatModel.findOne({ levelId: levelId, userId: req.userId }).session(session).lean(),
        ]);

        if (!leastMoves) {
          return res.status(500).json({
            error: 'Error finding Level.leastMoves',
          });
        }

        console.timeLog(id, 'found leastMoves and stats');

        const complete = moves <= leastMoves;
        const promises = [];

        if (!stat) {
          // add the stat if it did not previously exist
          promises.push(StatModel({
            _id: new ObjectId(),
            complete: complete,
            levelId: new ObjectId(levelId),
            moves: moves,
            userId: new ObjectId(req.userId),
          }).save({ session: session }));

          if (complete) {
            promises.push(UserModel.updateOne({ _id: req.userId }, { $inc: { score: 1 } }).session(session));
          }
        } else if (moves < stat.moves) {
          // update stat if it exists and a new personal best is set
          promises.push(StatModel.updateOne({ _id: stat._id }, {
            $set: {
              complete: complete,
              moves: moves,
            },
          }).session(session));

          if (!stat.complete && complete) {
            promises.push(UserModel.updateOne({ _id: req.userId }, { $inc: { score: 1 } }).session(session));
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
          }).session(session));

          // find the userIds that need to be updated
          const stats = await StatModel.find({
            complete: true,
            levelId: new ObjectId(levelId),
            userId: { $ne: req.userId },
          }, 'userId').session(session);

          if (stats && stats.length > 0) {
            // update the stats
            promises.push(StatModel.updateMany({
              complete: true,
              levelId: new ObjectId(levelId),
              userId: { $ne: req.userId },
            }, { $set: { complete: false } }).session(session));
  
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

        console.timeLog(id, 'updated stats');
      });
    } finally {
      session.endSession();
      console.timeLog(id, 'ended session');
    }

    console.timeEnd(id);

    // fetch(`${process.env.URI}/api/revalidate/leaderboard?secret=${process.env.REVALIDATE_SECRET}`);

    res.status(200).json({ success: true });
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
}

export default withAuth(handler);
