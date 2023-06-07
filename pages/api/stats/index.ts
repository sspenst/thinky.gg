import AchievementInfo from '@root/constants/achievementInfo';
import User from '@root/models/db/user';
import mongoose, { SaveOptions, Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import AchievementType from '../../../constants/achievementType';
import Discord from '../../../constants/discord';
import { ValidArray, ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import { createNewAchievement, createNewRecordOnALevelYouBeatNotifications } from '../../../helpers/notificationHelper';
import validateSolution from '../../../helpers/validateSolution';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import { LevelModel, PlayAttemptModel, RecordModel, StatModel, UserModel } from '../../../models/mongoose';
import { AttemptContext } from '../../../models/schemas/playAttemptSchema';
import { queueCalcPlayAttempts, queueRefreshIndexCalcs } from '../internal-jobs/worker';
import { MatchMarkCompleteLevel } from '../match/[matchId]';
import { forceCompleteLatestPlayAttempt } from '../play-attempt';

export function issueAchievements(userId: Types.ObjectId, score: number, options: SaveOptions) {
  const promises = [];

  for (const achievementType in AchievementInfo) {
    const achievementInfo = AchievementInfo[achievementType];

    if (achievementInfo.exactlyUnlocked({ score: score } as User)) {
      promises.push(createNewAchievement(achievementType as AchievementType, userId, options));
    }
  }

  return promises;
}

export default withAuth({
  GET: {},
  PUT: {
    body: {
      codes: ValidArray(),
      levelId: ValidObjectId(),
      matchId: ValidType('string', false),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    await dbConnect();

    const stats = await StatModel.find<Stat>({ userId: new Types.ObjectId(req.userId), isDeleted: { $ne: true } }, {}, { lean: true });

    return res.status(200).json(stats ?? []);
  } else if (req.method === 'PUT') {
    const { codes, levelId, matchId } = req.body;

    await dbConnect();

    // TODO: should all of this be in a transaction? might be more efficient / less error prone
    const [level, stat] = await Promise.all([
      LevelModel.findOne<Level>({ _id: levelId, isDeleted: { $ne: true } }, {}, { lean: true }),
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

    const ts = TimerUtil.getTs();
    // do a startSession to ensure the user stats are updated atomically
    const session = await mongoose.startSession();
    let complete = false;
    let newRecord = false;

    try {
      await session.withTransaction(async () => {
        const levelTransaction = await LevelModel.findById<Level>(levelId, 'archivedBy leastMoves userId', { lean: true, session: session });

        if (!levelTransaction) {
          throw new Error(`Level ${levelId} not found`);
        }

        complete = moves <= levelTransaction.leastMoves;

        // TODO: if complete, and previously not complete, then call forceCompleteLatestPlayAttempt
        // in the case of a record, we don't need to call forceCompleteLatestPlayAttempt early

        if (!stat) {
          // add the stat if it did not previously exist
          await StatModel.create([{
            _id: new Types.ObjectId(),
            attempts: 1,
            complete: complete,
            levelId: new Types.ObjectId(levelId),
            moves: moves,
            ts: ts,
            userId: new Types.ObjectId(req.userId),
          }], { session: session });

          if (complete) {
            // NB: await to avoid multiple user updates in parallel
            await Promise.all([
              UserModel.updateOne({ _id: req.userId }, { $inc: { score: 1 } }, { session: session }),
              ...issueAchievements(req.user._id, req.user.score + 1, { session: session }),
              forceCompleteLatestPlayAttempt(req.userId, levelId, ts, { session: session }),
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
            await Promise.all([
              ...issueAchievements(req.user._id, req.user.score + 1, { session: session }),
              forceCompleteLatestPlayAttempt(req.userId, levelId, ts, { session: session }),
            ]);
          }
        } else {
          // increment attempts in all other cases
          await StatModel.updateOne({ _id: stat._id }, { $inc: { attempts: 1 } }, { session: session });
        }

        // if a new record was set
        if (moves < levelTransaction.leastMoves) {
          const prevRecord = await RecordModel.findOne<Record>({ levelId: levelId }, {}, { session: session }).sort({ ts: -1 });

          // update calc_records if the previous record was set by a different user
          if (prevRecord && prevRecord.userId.toString() !== req.userId) {
            const authorId = levelTransaction.archivedBy?.toString() ?? levelTransaction.userId.toString();

            // decrease calc_records if the previous user was not the original level creator
            if (prevRecord.userId.toString() !== authorId) {
              // NB: await to avoid multiple user updates in parallel
              await UserModel.updateOne({ _id: prevRecord.userId }, { $inc: { calc_records: -1 } }, { session: session });
            }

            // increase calc_records if the new user was not the original level creator
            if (req.userId !== authorId) {
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
            _id: new Types.ObjectId(),
            levelId: new Types.ObjectId(levelId),
            moves: moves,
            ts: ts,
            userId: new Types.ObjectId(req.userId),
          }], { session: session });
          await PlayAttemptModel.updateMany(
            { levelId: new Types.ObjectId(levelId) },
            { $set: { attemptContext: AttemptContext.UNBEATEN } },
            { session: session },
          );
          await forceCompleteLatestPlayAttempt(req.userId, levelId, ts, { session: session });
          // find the userIds that need to be updated
          const stats = await StatModel.find<Stat>({
            complete: true,
            levelId: new Types.ObjectId(levelId),
            userId: { $ne: req.userId },
          }, 'userId', {
            lean: true,
            session: session,
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
            await createNewRecordOnALevelYouBeatNotifications(statUserIds, req.userId, levelId, moves.toString(), { session: session });
          }

          newRecord = true;
        }
      });
      session.endSession();
    } catch (err) {
      logger.error(err);
      session.endSession();

      return res.status(500).json({ error: 'Internal server error' });
    }

    const promises = [];

    if (complete && matchId) {
      // if there is a match Id... let's go ahead and update the match
      promises.push(MatchMarkCompleteLevel(req.user._id, matchId, level._id));
    }

    promises.push(queueRefreshIndexCalcs(level._id));

    if (newRecord) {
      // TODO: What happens if while calcPlayAttempts is running a new play attempt is recorded?
      promises.push([
        queueCalcPlayAttempts(level._id),
        queueDiscordWebhook(Discord.LevelsId, `**${req.user?.name}** set a new record: [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts}) - ${moves} moves`),
      ]);
    }

    await Promise.all(promises);

    return res.status(200).json({ success: true });
  }
});
