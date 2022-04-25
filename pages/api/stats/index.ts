import { LevelModel, StatModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Direction from '../../../constants/direction';
import Level from '../../../models/db/level';
import LevelDataType from '../../../constants/levelDataType';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import Position from '../../../models/position';
import Stat from '../../../models/db/stat';
import { UserModel } from '../../../models/mongoose';
import crypto from 'crypto';
import dbConnect from '../../../lib/dbConnect';

function validateSolution(directions: Direction[], level: Level) {
  const data = level.data.replace(/\n/g, '').split('');
  const endIndices = [];
  const posIndex = data.indexOf(LevelDataType.Start);
  const pos = new Position(posIndex % level.width, Math.floor(posIndex / level.width));
  let endIndex = -1;

  while ((endIndex = data.indexOf(LevelDataType.End, endIndex + 1)) != -1) {
    endIndices.push(endIndex);
  }

  for (let i = 0; i < directions.length; i++) {
    const direction = directions[i];

    // update position with direction
    switch (direction) {
      case Direction.Left:
        pos.x -= 1;
        if (pos.x < 0) {
          return false;
        }
        break;
      case Direction.Up:
        pos.y -= 1;
        if (pos.y < 0) {
          return false;
        }
        break;
      case Direction.Right:
        pos.x += 1;
        if (pos.x >= level.width) {
          return false;
        }
        break;
      case Direction.Down:
        pos.y += 1;
        if (pos.y >= level.height) {
          return false;
        }
        break;
      default:
        return false; 
    }

    const posIndex = pos.y * level.width + pos.x;
    const levelDataTypeAtPos = data[posIndex];

    // check if new position is valid
    if (levelDataTypeAtPos === LevelDataType.Wall ||
      levelDataTypeAtPos === LevelDataType.Hole) {
      return false;
    }

    // if a block is being moved
    if (LevelDataType.canMove(levelDataTypeAtPos)) {
      const blockPos = pos.clone();

      // validate and update block position with direction
      switch (direction) {
        case Direction.Left:
          if (!LevelDataType.canMoveLeft(levelDataTypeAtPos)) {
            return false;
          }
          blockPos.x -= 1;
          if (blockPos.x < 0) {
            return false;
          }
          break;
        case Direction.Up:
          if (!LevelDataType.canMoveUp(levelDataTypeAtPos)) {
            return false;
          }
          blockPos.y -= 1;
          if (blockPos.y < 0) {
            return false;
          }
          break;
        case Direction.Right:
          if (!LevelDataType.canMoveRight(levelDataTypeAtPos)) {
            return false;
          }
          blockPos.x += 1;
          if (blockPos.x >= level.width) {
            return false;
          }
          break;
        case Direction.Down:
          if (!LevelDataType.canMoveDown(levelDataTypeAtPos)) {
            return false;
          }
          blockPos.y += 1;
          if (blockPos.y >= level.height) {
            return false;
          }
          break;
        default:
          return false; 
      }

      const blockPosIndex = blockPos.y * level.width + blockPos.x;

      if (data[blockPosIndex] === LevelDataType.Wall ||
        LevelDataType.canMove(data[blockPosIndex])) {
        return false;
      } else if (data[blockPosIndex] === LevelDataType.Hole) {
        data[blockPosIndex] = LevelDataType.Default;
      } else {
        data[blockPosIndex] = levelDataTypeAtPos;
      }

      // clear movable from the position
      data[posIndex] = LevelDataType.Default;
    }
  }

  return endIndices.includes(pos.y * level.width + pos.x);
}

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();

    const stats = await StatModel.find<Stat>({ userId: new ObjectId(req.userId) });

    return res.status(200).json(stats ?? []);
  } else if (req.method === 'PUT') {
    const id = crypto.randomUUID();
    console.time(id);

    const { directions, levelId } = req.body;

    await dbConnect();

    console.timeLog(id, 'connected to db');

    // NB: it's possible that in between retrieving the leastMoves and updating the user stats
    // a record leastMoves could have been set, which would make the complete/score properties inaccurate.
    // could use a transaction to ensure the data is accurate but Vercel seems to randomly hang when
    // calling startSession()
    const [level, stat] = await Promise.all([
      LevelModel.findById<Level>(levelId),
      StatModel.findOne<Stat>({ levelId: levelId, userId: req.userId }),
    ]);

    if (!level) {
      return res.status(500).json({
        error: 'Error finding Level.leastMoves',
      });
    } else if (level.leastMoves === 0) {
      // a leastMoves of 0 indicates a test level; no stats are saved
      return res.status(200).json({ success: true });
    }

    console.timeLog(id, 'found leastMoves and stat');

    if (!validateSolution(directions, level)) {
      return res.status(400).json({
        error: 'Invalid solution provided',
      });
    }

    const moves = directions.length;
    const complete = moves <= level.leastMoves;
    const promises = [];

    if (!stat) {
      // add the stat if it did not previously exist
      promises.push(StatModel.create({
        _id: new ObjectId(),
        attempts: 1,
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
        $inc: {
          attempts: 1,
        },
        $set: {
          complete: complete,
          moves: moves,
        },
      }));

      if (!stat.complete && complete) {
        promises.push(UserModel.updateOne({ _id: req.userId }, { $inc: { score: 1 } }));
      }
    } else {
      // increment attempts in all other cases
      promises.push(StatModel.updateOne({ _id: stat._id }, { $inc: { attempts: 1 } }));
    }

    // if a new record was set
    if (moves < level.leastMoves) {
      // update level with new leastMoves data
      promises.push(LevelModel.updateOne({ _id: levelId }, {
        $set: {
          leastMoves: moves,
          leastMovesTs: Date.now(),
          leastMovesUserId: req.userId,
        },
      }));

      // find the userIds that need to be updated
      const stats = await StatModel.find<Stat>({
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
