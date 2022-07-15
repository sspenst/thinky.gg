import { LevelModel, RecordModel, StatModel, UserModel } from '../../../models/mongoose';
import Position, { getDirectionFromCode } from '../../../models/position';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Discord from '../../../constants/discord';
import Level from '../../../models/db/level';
import LevelDataType from '../../../constants/levelDataType';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import User from '../../../models/db/user';
import dbConnect from '../../../lib/dbConnect';
import discordWebhook from '../../../helpers/discordWebhook';
import getTs from '../../../helpers/getTs';

function validateSolution(codes: string[], level: Level) {
  const data = level.data.replace(/\n/g, '').split('');
  const endIndices = [];
  const posIndex = data.indexOf(LevelDataType.Start);
  let pos = new Position(posIndex % level.width, Math.floor(posIndex / level.width));
  let endIndex = -1;

  while ((endIndex = data.indexOf(LevelDataType.End, endIndex + 1)) != -1) {
    endIndices.push(endIndex);
  }

  for (let i = 0; i < codes.length; i++) {
    const direction = getDirectionFromCode(codes[i]);

    if (!direction) {
      return false;
    }

    // validate and update position with direction
    pos = pos.add(direction);

    if (pos.x < 0 || pos.x >= level.width || pos.y < 0 || pos.y >= level.height) {
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
      // validate block is allowed to move in this direction
      if ((direction.equals(new Position(-1, 0)) && !LevelDataType.canMoveLeft(levelDataTypeAtPos)) ||
        (direction.equals(new Position(0, -1)) && !LevelDataType.canMoveUp(levelDataTypeAtPos)) ||
        (direction.equals(new Position(1, 0)) && !LevelDataType.canMoveRight(levelDataTypeAtPos)) ||
        (direction.equals(new Position(0, 1)) && !LevelDataType.canMoveDown(levelDataTypeAtPos))) {
        return false;
      }

      // validate and update block position with direction
      const blockPos = pos.add(direction);

      if (blockPos.x < 0 || blockPos.x >= level.width || blockPos.y < 0 || blockPos.y >= level.height) {
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

    if (!req.body) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const { codes, levelId } = req.body;

    if (!codes || !levelId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    await dbConnect();

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
    }

    if (!validateSolution(codes, level)) {
      return res.status(400).json({
        error: 'Invalid solution provided',
      });
    }

    const moves = codes.length;

    // set the least moves if this is a draft level
    if (level.userId.toString() === req.userId && level.isDraft) {
      if (level.leastMoves === 0 || moves < level.leastMoves) {
        await LevelModel.updateOne({ _id: levelId }, {
          $set: { leastMoves: moves },
        });
      }

      return res.status(200).json({ success: true });
    }

    // ensure no stats are saved for custom levels
    if (level.leastMoves === 0 || level.isDraft) {
      return res.status(200).json({ success: true });
    }

    const complete = moves <= level.leastMoves;
    const promises = [];
    const ts = getTs();

    if (!stat) {
      // add the stat if it did not previously exist
      promises.push(StatModel.create({
        _id: new ObjectId(),
        attempts: 1,
        complete: complete,
        levelId: new ObjectId(levelId),
        moves: moves,
        ts: ts,
        userId: new ObjectId(req.userId),
      }));

      if (complete) {
        // NB: await to avoid multiple user updates in parallel
        await UserModel.updateOne({ _id: req.userId }, { $inc: { score: 1 } });
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
          ts: ts,
        },
      }));

      if (!stat.complete && complete) {
        // NB: await to avoid multiple user updates in parallel
        await UserModel.updateOne({ _id: req.userId }, { $inc: { score: 1 } });
      }
    } else {
      // increment attempts in all other cases
      promises.push(StatModel.updateOne({ _id: stat._id }, { $inc: { attempts: 1 } }));
    }

    // if a new record was set
    if (moves < level.leastMoves) {
      const prevRecord = await RecordModel.findOne<Record>({ levelId: levelId }).sort({ ts: -1 });

      // update calc_records if the previous record was set by a different user
      if (prevRecord && prevRecord.userId.toString() !== req.userId) {
        // decrease calc_records if the previous user was not the original level creator
        if (prevRecord.userId.toString() !== level.userId.toString()) {
          // NB: await to avoid multiple user updates in parallel
          await UserModel.updateOne({ _id: prevRecord.userId }, { $inc: { calc_records: -1 } });
        }

        // increase calc_records if the new user was not the original level creator
        if (req.userId !== level.userId.toString()) {
          promises.push(UserModel.updateOne({ _id: req.userId }, { $inc: { calc_records: 1 } }));
        }
      }

      // update level with new leastMoves data
      promises.push(
        LevelModel.updateOne({ _id: levelId }, {
          $set: { leastMoves: moves },
        }),
        RecordModel.create({
          _id: new ObjectId(),
          levelId: new ObjectId(levelId),
          moves: moves,
          ts: ts,
          userId: new ObjectId(req.userId),
        }),
      );

      // find the userIds that need to be updated
      const [stats, user] = await Promise.all([
        StatModel.find<Stat>({
          complete: true,
          levelId: new ObjectId(levelId),
          userId: { $ne: req.userId },
        }, 'userId'),
        UserModel.findById<User>(req.userId),
      ]);

      if (stats && stats.length > 0) {
        // update all stats/users that had the record on this level
        promises.push(
          StatModel.updateMany(
            { _id: { $in: stats.map(stat => stat._id) } },
            { $set: { complete: false } },
          ),
          UserModel.updateMany(
            { _id: { $in: stats.map(stat => stat.userId) } }, { $inc: { score: -1 } },
          ),
        );
      }

      promises.push(discordWebhook(Discord.LevelsId, `**${user?.name}** set a new record: [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts}) - ${moves} moves`));
    }

    await Promise.all(promises);

    return res.status(200).json({ success: true });
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
