import { AchievementCategory } from '@root/constants/achievements/achievementInfo';
import Direction from '@root/constants/direction';
import { Games } from '@root/constants/Games';
import getDifficultyEstimate from '@root/helpers/getDifficultyEstimate';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { matchMarkCompleteLevel } from '@root/helpers/match/matchMarkCompleteLevel';
import { randomRotateLevelDataViaMatchHash } from '@root/helpers/randomRotateLevelDataViaMatchHash';
import PlayAttempt from '@root/models/db/playAttempt';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import Discord from '../../../constants/discord';
import { ValidArray, ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import { createNewRecordOnALevelYouSolvedNotifications } from '../../../helpers/notificationHelper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level, { EnrichedLevel } from '../../../models/db/level';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import { LevelModel, PlayAttemptModel, RecordModel, StatModel, UserConfigModel } from '../../../models/mongoose';
import { queueGenLevelImage, queueRefreshAchievements, queueRefreshIndexCalcs } from '../internal-jobs/worker';

export async function putStat(user: User, directions: Direction[], levelId: string, matchId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resTrack = { status: 500, json: { error: 'Internal server error' } as any };
  const ts = TimerUtil.getTs();
  const session = await mongoose.startSession();

  const userId = user._id;

  try {
    await session.withTransaction(async () => {
      const level = await LevelModel.findOne({ _id: levelId, isDeleted: { $ne: true } }, {}, { session: session }).lean<Level>();

      if (!level) {
        resTrack.status = 404;
        resTrack.json.error = `Error finding level ${levelId}`;
        throw new Error(resTrack.json.error);
      }

      if (level.isDraft && level.userId.toString() !== userId.toString()) {
        resTrack.status = 401;
        resTrack.json.error = `Unauthorized access for level ${levelId}`;
        throw new Error(resTrack.json.error);
      }

      if (matchId) {
        randomRotateLevelDataViaMatchHash(level, matchId);
      }

      const validateSolutionFunction = Games[level.gameId].validateSolutionFunction;

      if (!validateSolutionFunction(directions, level)) {
        resTrack.status = 400;
        resTrack.json.error = `Invalid solution provided for level ${levelId}`;
        throw new Error(resTrack.json.error);
      }

      const moves = directions.length;

      // ensure no stats are saved for draft levels
      if (level.isDraft || level.leastMoves === 0) {
        if (moves < level.leastMoves || level.leastMoves === 0) {
          await LevelModel.updateOne({ _id: level._id }, {
            $set: { leastMoves: moves },
          }, { session: session });
        }

        return resTrack;
      }

      const complete = moves <= level.leastMoves;

      const promises = [];

      if (complete && matchId) {
        // TODO: use session here
        promises.push(matchMarkCompleteLevel(userId, matchId, level._id));
      }

      const [stat] = await Promise.all([
        StatModel.findOne({ userId: userId, levelId: level._id, }, {}, { session: session }).lean<Stat>(),
        ...promises,
      ]);

      // level was previously solved and no personal best was set, only need to $inc attempts and return
      if (stat && moves >= stat.moves) {
        await StatModel.updateOne({ _id: stat._id }, { $inc: { attempts: 1 } }, { session: session });

        return resTrack;
      }

      // log if session has been ended

      // track the new personal best in a stat
      if (!stat) {
        await Promise.all(
          [StatModel.create([{
            _id: new Types.ObjectId(),
            attempts: 1,
            complete: complete,
            gameId: level.gameId,
            levelId: level._id,
            moves: moves,
            ts: ts,
            userId: userId,
          }], { session: session }),
          // The first time solving this level we should increment calcLevelsCompletedCount
          UserConfigModel.updateOne({ userId: userId, gameId: level.gameId }, { $inc: { calcLevelsCompletedCount: 1 } }, { session: session }),
          ]);
      } else {
        await StatModel.updateOne({ _id: stat._id }, {
          $inc: {
            attempts: 1,
          },
          $set: {
            complete: complete,
            moves: moves,
            ts: ts,
          },
        }, { session: session });
      }

      // if the level was not completed optimally, nothing more to be done
      if (!complete) {
        return resTrack;
      }

      // if the level was previously incomplete, increment score
      if (!stat?.complete) {
        const userConfigInc: mongoose.AnyKeys<UserConfig> = { calcLevelsSolvedCount: 1 };

        if (level.isRanked) {
          userConfigInc.calcRankedSolves = 1;
        }

        await Promise.all([
          UserConfigModel.updateOne({ userId: userId, gameId: level.gameId }, { $inc: userConfigInc }, { session: session }),
          queueRefreshAchievements(level.gameId, userId, [AchievementCategory.SKILL, AchievementCategory.USER], { session: session })
        ]);
      }

      const newRecord = moves < level.leastMoves;
      let incPlayattemptsDurationSum = 0;

      if (newRecord) {
        const prevRecord = await RecordModel.findOne<Record>({ levelId: level._id }, {}, { session: session }).sort({ ts: -1 });

        // update calcRecordsCount if the previous record was set by a different user
        if (prevRecord && prevRecord.userId.toString() !== userId.toString()) {
          const authorId = level.archivedBy?.toString() ?? level.userId.toString();

          // decrease calcRecordsCount if the previous user was not the original level creator
          if (prevRecord.userId.toString() !== authorId) {
            // NB: await to avoid multiple user updates in parallel
            await UserConfigModel.updateOne({ userId: prevRecord.userId, gameId: level.gameId }, { $inc: { calcRecordsCount: -1 } }, { session: session });
          }

          // increase calcRecordsCount if the new user was not the original level creator
          if (userId.toString() !== authorId) {
            await UserConfigModel.updateOne({ userId: userId, gameId: level.gameId }, { $inc: { calcRecordsCount: 1 } }, { session: session });
          }
        }

        // TODO can these two promises be combined to an promise all?
        await RecordModel.create([{
          _id: new Types.ObjectId(),
          gameId: level.gameId,
          levelId: level._id,
          moves: moves,
          ts: ts,
          userId: userId,
        }], { session: session });

        // find the stats and users that that need to be updated
        const stats = await StatModel.find({
          userId: { $ne: userId },
          levelId: level._id,
          complete: true,
        }, 'userId', {
          session: session,
        }).lean<Stat[]>();

        const userConfigInc: mongoose.AnyKeys<UserConfig> = { calcLevelsSolvedCount: -1 }; // Don't need to decrement calcLevelsCompletedCount because technically the level is still completed

        if (level.isRanked) {
          userConfigInc.calcRankedSolves = -1;
        }

        // update all stats/users that had the record on this level
        if (stats.length > 0) {
          const statUserIds = stats.map(s => s.userId);

          await Promise.all([
            StatModel.updateMany(
              { _id: { $in: stats.map(s => s._id) } },
              { $set: { complete: false } },
              { session: session },
            ),
            UserConfigModel.updateMany(
              { userId: { $in: statUserIds }, gameId: level.gameId },
              { $inc: userConfigInc },
              { session: session },
            ),
            createNewRecordOnALevelYouSolvedNotifications(level.gameId, statUserIds, userId, level._id, moves.toString(), { session: session })
          ]);
        }

        // keep track of all playtime after the record was set
        const sumDuration = await PlayAttemptModel.aggregate([
          {
            $match: {
              levelId: level._id,
              attemptContext: AttemptContext.SOLVED,
            }
          },
          {
            $group: {
              _id: null,
              sumDuration: {
                $sum: {
                  $subtract: ['$endTime', '$startTime']
                }
              }
            }
          }
        ], { session: session });

        incPlayattemptsDurationSum += sumDuration[0]?.sumDuration ?? 0;

        // reset all playattempts to unsolved
        const game = getGameFromId(level.gameId);

        await Promise.all([
          PlayAttemptModel.updateMany(
            { levelId: level._id },
            { $set: { attemptContext: AttemptContext.UNSOLVED } },
            { session: session },
          ),
          queueDiscordWebhook(Discord.Levels, `**${game.displayName}** - **${user.name}** set a new record: [${level.name}](${getGameFromId(level.gameId).baseUrl}/level/${level.slug}?ts=${ts}) - ${moves} moves`, { session: session }),
          queueGenLevelImage(level._id, false, { session: session }),
        ]);
      }

      // extend the user's recent playattempt up to current ts
      const found = await PlayAttemptModel.findOneAndUpdate({
        levelId: level._id,
        userId: userId,
        endTime: { $gt: ts - 3 * 60 },
      }, {
        $set: {
          attemptContext: AttemptContext.JUST_SOLVED,
          endTime: ts,
        },
        $inc: { updateCount: 1 }
      }, {
        new: false,
        session: session,
        sort: {
          endTime: -1,
          // NB: if end time is identical, we want to get the highest attempt context (JUST_SOLVED over UNSOLVED)
          attemptContext: -1,
        },
      }).lean<PlayAttempt>();

      if (!found) {
        // create one if it did not exist... rare but possible
        await PlayAttemptModel.create([{
          _id: new Types.ObjectId(),
          attemptContext: AttemptContext.JUST_SOLVED,
          endTime: ts,
          gameId: level.gameId,
          levelId: level._id,
          startTime: ts,
          updateCount: 0,
          userId: userId,
        }], { session: session });
      } else {
        incPlayattemptsDurationSum += ts - found.endTime;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const levelUpdate: mongoose.AnyKeys<any> = {
        $addToSet: {
          calc_playattempts_unique_users: userId,
        },
        $inc: {
          calc_playattempts_duration_sum: incPlayattemptsDurationSum,
        },
      };

      if (newRecord) {
        levelUpdate['$set'] = {
          calc_playattempts_just_beaten_count: 1,
          leastMoves: moves,
        };
      } else {
        levelUpdate['$inc']['calc_playattempts_just_beaten_count'] = 1;
      }

      const enrichedLevel = await LevelModel.findByIdAndUpdate(level._id, levelUpdate, {
        new: true,
        projection: {
          calc_playattempts_duration_sum: 1,
          calc_playattempts_just_beaten_count: 1,
          calc_playattempts_unique_users_count: { $size: '$calc_playattempts_unique_users' },
        },
        session: session,
      }).lean<EnrichedLevel>();

      // should be impossible, but need this check for typescript to be happy
      if (!enrichedLevel) {
        throw new Error('Level ' + levelId + ' not found within transaction');
      }

      await LevelModel.findByIdAndUpdate(level._id, {
        $set: {
          calc_difficulty_estimate: getDifficultyEstimate(enrichedLevel, enrichedLevel.calc_playattempts_unique_users_count ?? 0),
        },
      }, { session: session });

      await queueRefreshIndexCalcs(level._id, { session: session });
    });

    resTrack.status = 200;
    resTrack.json = { success: true };
  } catch (err) {
    logger.error('Error in api/stats', err);
  }

  session.endSession();

  return resTrack;
}

export default withAuth({
  GET: {},
  PUT: {
    body: {
      directions: ValidArray(),
      levelId: ValidObjectId(),
      matchId: ValidType('string', false),
    }
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // Todo: only select needed fields here to minimize data transfer
    const stats = await StatModel.find({ userId: new Types.ObjectId(req.userId), isDeleted: { $ne: true }, gameId: req.gameId }).lean<Stat[]>();

    return res.status(200).json(stats);
  } else if (req.method === 'PUT') {
    const { directions, levelId, matchId } = req.body;

    for (const direction of directions) {
      if (!(direction in Direction)) {
        return res.status(400).json({
          error: `Invalid direction provided: ${direction}`,
        });
      }
    }

    const resTrack = await putStat(req.user, directions, levelId, matchId);

    return res.status(resTrack.status).json(resTrack.json);
  }
});
