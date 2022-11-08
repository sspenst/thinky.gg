import { ObjectId } from 'bson';
import mongoose from 'mongoose';
import type { NextApiResponse } from 'next';
import Discord from '../../../constants/discord';
import LevelDataType from '../../../constants/levelDataType';
import { ValidArray, ValidObjectId } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import { createNewRecordOnALevelYouBeatNotification } from '../../../helpers/notificationHelper';
import revalidateLevel from '../../../helpers/revalidateLevel';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import { LevelModel, PlayAttemptModel, RecordModel, StatModel, UserModel } from '../../../models/mongoose';
import Position, { getDirectionFromCode } from '../../../models/position';
import { calcPlayAttempts } from '../../../models/schemas/levelSchema';
import { AttemptContext } from '../../../models/schemas/playAttemptSchema';
import { queueRefreshIndexCalcs } from '../internal-jobs/worker';
import { forceUpdateLatestPlayAttempt } from '../play-attempt';

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

export default withAuth({
  GET: {},
  PUT: {
    body: {
      codes: ValidArray(),
      levelId: ValidObjectId(),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();

    const stats = await StatModel.find<Stat>({ userId: new ObjectId(req.userId) }, {}, { lean: true });

    return res.status(200).json(stats ?? []);
  } else if (req.method === 'PUT') {
    const { codes, levelId } = req.body;

    await dbConnect();

    // NB: it's possible that in between retrieving the leastMoves and updating the user stats
    // a record leastMoves could have been set, which would make the complete/score properties inaccurate.

    const [level, stat] = await Promise.all([
      LevelModel.findById<Level>(levelId, {}, { lean: true }),
      StatModel.findOne<Stat>({ levelId: levelId, userId: req.userId }, {}, { lean: true }),
    ]);

    if (!level || (level.userId.toString() !== req.userId && level.isDraft)) {
      return res.status(404).json({
        error: 'Error finding Level',
      });
    }

    if (!validateSolution(codes, level)) {
      return res.status(400).json({
        error: 'Invalid solution provided',
      });
    }

    const moves = codes.length;

    // set the least moves if this is a draft level
    if (level.isDraft) {
      if (level.leastMoves === 0 || moves < level.leastMoves) {
        await LevelModel.updateOne({ _id: levelId }, {
          $set: { leastMoves: moves },
        });

        return res.status(200).json({ success: true });
      }
    }

    // ensure no stats are saved for custom levels
    if (level.leastMoves === 0 || level.isDraft) {
      return res.status(200).json({ success: true });
    }

    const complete = moves <= level.leastMoves;

    const ts = TimerUtil.getTs();
    // do a startSession to ensure the user stats are updated atomically
    const session = await mongoose.startSession();
    let newRecord = false;

    try {
      await session.withTransaction(async () => {
        if (!stat) {
          // add the stat if it did not previously exist
          await StatModel.create([{
            _id: new ObjectId(),
            attempts: 1,
            complete: complete,
            levelId: new ObjectId(levelId),
            moves: moves,
            ts: ts,
            userId: new ObjectId(req.userId),
          }], { session: session });

          if (complete) {
            // NB: await to avoid multiple user updates in parallel
            await Promise.all([
              UserModel.updateOne({ _id: req.userId }, { $inc: { score: 1 } }, { session: session }),
              forceUpdateLatestPlayAttempt( req.userId, levelId, AttemptContext.JUST_BEATEN, ts, { session: session }),
            ]);
          }
        } else if (moves < stat.moves) {
          // update stat if it exists and a new personal best is set
          await StatModel.updateOne({ _id: stat._id }, {
            $inc: {
              attempts: 1,
            },
            $set: {
              complete: complete,
              moves: moves,
              ts: ts,
            },
          }, { session: session }).exec();

          if (!stat.complete && complete) {
            // NB: await to avoid multiple user updates in parallel

            await UserModel.updateOne({ _id: req.userId }, { $inc: { score: 1 } }, { session: session });
            await forceUpdateLatestPlayAttempt( req.userId, levelId, AttemptContext.JUST_BEATEN, ts, { session: session });
          }
        } else {
          // increment attempts in all other cases
          await StatModel.updateOne({ _id: stat._id }, { $inc: { attempts: 1 } }, { session: session });
        }

        // if a new record was set
        if (moves < level.leastMoves) {
          const prevRecord = await RecordModel.findOne<Record>({ levelId: levelId }, {}, { session: session }).sort({ ts: -1 });

          // update calc_records if the previous record was set by a different user
          if (prevRecord && prevRecord.userId.toString() !== req.userId) {
            // decrease calc_records if the previous user was not the original level creator
            if (prevRecord.userId.toString() !== level.userId.toString()) {
              // NB: await to avoid multiple user updates in parallel
              await UserModel.updateOne({ _id: prevRecord.userId }, { $inc: { calc_records: -1 } }, { session: session });
            }

            // increase calc_records if the new user was not the original level creator
            if (req.userId !== level.userId.toString()) {
              await UserModel.updateOne({ _id: req.userId }, { $inc: { calc_records: 1 } }, { session: session });
            }
          }

          // update level with new leastMoves data
          await LevelModel.updateOne({ _id: levelId }, {
            $set: {
              leastMoves: moves,
              // NB: set to 0 here because forceUpdateLatestPlayAttempt will increment to 1
              calc_playattempts_just_beaten_count: 0,
            },
          }, { session: session });
          await RecordModel.create([{
            _id: new ObjectId(),
            levelId: new ObjectId(levelId),
            moves: moves,
            ts: ts,
            userId: new ObjectId(req.userId),
          }], { session: session });
          await PlayAttemptModel.updateMany(
            { levelId: new ObjectId(levelId) },
            { $set: { attemptContext: AttemptContext.UNBEATEN } },
            { session: session },
          );
          await forceUpdateLatestPlayAttempt(req.userId, levelId, AttemptContext.JUST_BEATEN, ts, { session: session });
          // find the userIds that need to be updated
          const stats = await StatModel.find<Stat>({
            complete: true,
            levelId: new ObjectId(levelId),
            userId: { $ne: req.userId },
          }, 'userId', {
            lean: true
          });

          if (stats && stats.length > 0) {
            // update all stats/users that had the record on this level
            const statUserIds = stats.map(s => s.userId);

            await StatModel.updateMany(
              { _id: { $in: stats.map(stat => stat._id) } },
              { $set: { complete: false } }, { session: session }
            );
            await UserModel.updateMany(
              { _id: { $in: statUserIds } }, { $inc: { score: -1 } }, { session: session }
            );

            // create a notification for each user
            await createNewRecordOnALevelYouBeatNotification(statUserIds, req.userId, levelId, moves.toString());
          }

          newRecord = true;
        }
      });
    } catch (err) {
      logger.error(err);

      return res.status(500).json({ error: 'Internal server error' });
    }

    const promises = [];

    promises.push(queueRefreshIndexCalcs(level._id));

    if (newRecord) {
      // TODO: What happens if while calcPlayAttempts is running a new play attempt is recorded?
      promises.push([
        calcPlayAttempts(level._id),
        queueDiscordWebhook(Discord.LevelsId, `**${req.user?.name}** set a new record: [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts}) - ${moves} moves`),
        revalidateLevel(res, level.slug),
      ]);
    }

    await Promise.all(promises);

    return res.status(200).json({ success: true });
  }
});
