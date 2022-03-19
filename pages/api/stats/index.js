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
    await session.withTransaction(async () => {
      const [level, user] = await Promise.all([
        LevelModel.findById(levelId).session(session),
        UserModel.findOne({ email: req.email }).session(session),
      ]);
    
      if (!level) {
        return res.status(500).json({
          error: 'Error finding Level',
        });
      }
    
      if (!user) {
        return res.status(500).json({
          error: 'Error finding User',
        });
      }
    
      const complete = moves <= level.leastMoves;
      const stat = user.stats.find(stat => stat.levelId.toString() === levelId);
    
      if (!stat) {
        // add the stat if it did not previously exist
        await UserModel.updateOne(
          {
            email: req.email,
            'stats.levelId': { $ne: new ObjectId(levelId) },
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
      } else if (moves < stat.moves) {
        // update stat if it exists and a new personal best is set
        await UserModel.updateOne(
          {
            email: req.email,
            stats: {
              $elemMatch: {
                levelId: new ObjectId(levelId),
              }
            },
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
    
      // if a new record was set
      if (moves < level.leastMoves) {
        await Promise.all([
          // update level with new leastMoves data
          LevelModel.updateOne(
            { _id: levelId },
            {
              leastMoves: moves,
              leastMovesTs: Date.now(),
              leastMovesUserId: user._id,
            },
            { multi: true },
          ).session(session),
          // update all users that have a record on this level
          UserModel.updateMany(
            {
              email: { $ne: req.email },
              stats: {
                $elemMatch: {
                  levelId: new ObjectId(levelId),
                  moves: level.leastMoves,
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
      }
    });
  } finally {
    session.endSession();
  }

  // const uri = process.env.LOCAL ? 'http://localhost:3000' : 'https://pathology.sspenst.com';

  // revalidate the leaderboard in the background, however this is not guaranteed to complete
  // if the leaderboard isn't updated here, the client will still get the latest data with SWR
  // fetch(`${uri}/api/revalidate?secret=${process.env.REVALIDATE_SECRET}`);

  res.status(200).json({ success: true });
}

export default withAuth(handler);
