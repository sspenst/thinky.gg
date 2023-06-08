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
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import { LevelModel, PlayAttemptModel, RecordModel, StatModel, UserModel } from '../../../models/mongoose';
import { AttemptContext } from '../../../models/schemas/playAttemptSchema';
import { queueRefreshIndexCalcs } from '../internal-jobs/worker';
import { matchMarkCompleteLevel } from '../match/[matchId]';
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
    const stats = await StatModel.find<Stat>({ userId: new Types.ObjectId(req.userId), isDeleted: { $ne: true } }, {}, { lean: true });

    return res.status(200).json(stats);
  } else if (req.method === 'PUT') {
    const { codes, levelId, matchId } = req.body;
    const ts = TimerUtil.getTs();
    const session = await mongoose.startSession();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resTrack = { status: 500, json: { error: 'Internal server error' } as any };

    try {
      await session.withTransaction(async () => {
        const level = await LevelModel.findOne<Level>({ _id: levelId, isDeleted: { $ne: true } }, {}, { lean: true, session: session });

        if (!level || (level.isDraft && level.userId.toString() !== req.userId)) {
          resTrack.status = 404;
          resTrack.json.error = `Error finding level ${levelId}`;
          throw new Error(resTrack.json.error);
        }

        if (!validateSolution(codes, level)) {
          resTrack.status = 400;
          resTrack.json.error = `Invalid solution provided for level ${levelId}`;
          throw new Error(resTrack.json.error);
        }

        const moves = codes.length;

        // ensure no stats are saved for draft levels
        if (level.isDraft || level.leastMoves === 0) {
          if (moves < level.leastMoves || level.leastMoves === 0) {
            await LevelModel.updateOne({ _id: levelId }, {
              $set: { leastMoves: moves },
            }, { session: session });
          }

          return;
        }

        const stat = await StatModel.findOne<Stat>({ levelId: levelId, userId: req.userId }, {}, { lean: true, session: session });
        const complete = moves <= level.leastMoves;

        // TODO: if complete, and previously not complete, then call forceCompleteLatestPlayAttempt
        // in the case of a record, we don't need to call forceCompleteLatestPlayAttempt early
        // TODO: keep track of updates to UserModel and update all at once (currently may $inc twice)

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
        if (moves < level.leastMoves) {
          const prevRecord = await RecordModel.findOne<Record>({ levelId: levelId }, {}, { session: session }).sort({ ts: -1 });

          // update calc_records if the previous record was set by a different user
          if (prevRecord && prevRecord.userId.toString() !== req.userId) {
            const authorId = level.archivedBy?.toString() ?? level.userId.toString();

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

          await queueDiscordWebhook(Discord.LevelsId, `**${req.user?.name}** set a new record: [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts}) - ${moves} moves`, { session: session });
        }

        await queueRefreshIndexCalcs(level._id, { session: session });

        if (complete && matchId) {
          // TODO: use session here
          await matchMarkCompleteLevel(req.user._id, matchId, level._id);
        }
      });

      resTrack.status = 200;
      resTrack.json = { success: true };
    } catch (err) {
      logger.error('Error in api/stats', err);
    }

    session.endSession();

    return res.status(resTrack.status).json(resTrack.json);
  }
});
