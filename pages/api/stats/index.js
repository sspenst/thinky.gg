import LevelModel from '../../../models/mongoose/levelModel';
import { ObjectId } from 'bson';
import UserModel from '../../../models/mongoose/userModel';
import dbConnect from '../../../lib/dbConnect';
import mongoose from 'mongoose';
import withAuth from '../../../lib/withAuth';

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { levelId, moves } = req.body;

  await dbConnect();

  const session = await mongoose.startSession();

  try {
    // NB: using a transaction because it's possible that in between retrieving the leastMoves and updating the
    // user stats a record leastMoves could have been set, which would make the complete/score properties inaccurate
    await session.withTransaction(async () => {
      const [{ leastMoves }, { stats }] = await Promise.all([
        LevelModel.findById(levelId, 'leastMoves').session(session).lean(),
        UserModel.findById(req.userId,
          {
            _id: 0,
            stats: {
              $elemMatch: {
                levelId: new ObjectId(levelId),
              }
            },
          },
        ).session(session).lean(),
      ]);

      if (!leastMoves) {
        return res.status(500).json({
          error: 'Error finding Level.leastMoves',
        });
      }

      const complete = moves <= leastMoves;

      if (!stats) {
        // add the stat if it did not previously exist
        await UserModel.updateOne(
          {
            _id: req.userId,
          },
          {
            $inc: { score: +complete },
            $push: {
              stats: {
                complete: complete,
                levelId: new ObjectId(levelId),
                moves: moves,
              }
            }
          },
        ).session(session);
      } else {
        const stat = stats[0];

        if (moves < stat.moves) {
          // update stat if it exists and a new personal best is set
          await UserModel.updateOne(
            {
              _id: req.userId,
              'stats.levelId': new ObjectId(levelId),
            },
            {
              $inc: { score: +(!stat.complete && complete) },
              $set: {
                'stats.$.complete': complete,
                'stats.$.moves': moves,
              },
            },
          ).session(session);
        }
      }

      // if a new record was set
      if (moves < leastMoves) {
        await Promise.all([
          // update level with new leastMoves data
          LevelModel.updateOne(
            { _id: levelId },
            {
              leastMoves: moves,
              leastMovesTs: Date.now(),
              leastMovesUserId: req.userId,
            },
            { multi: true },
          ).session(session),
          // update all users that have a record on this level
          UserModel.updateMany(
            {
              _id: { $ne: req.userId },
              stats: {
                $elemMatch: {
                  complete: true,
                  levelId: new ObjectId(levelId),
                }
              },
            },
            {
              $inc: { score: -1 },
              $set: {
                'stats.$.complete': false,
              },
            },
          ).session(session),
        ]);
        
        // TODO: try adding these back once unstable_revalidate is improved
        // fetch(`${process.env.URI}/api/revalidate/level/${levelId}?secret=${process.env.REVALIDATE_SECRET}`);
        // fetch(`${process.env.URI}/api/revalidate/pack/${level.packId}?secret=${process.env.REVALIDATE_SECRET}`);
      }
    });
  } finally {
    session.endSession();
  }

  // fetch(`${process.env.URI}/api/revalidate/leaderboard?secret=${process.env.REVALIDATE_SECRET}`);

  res.status(200).json({ success: true });
}

export default withAuth(handler);
