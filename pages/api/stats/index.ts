import { AchievementCategory } from '@root/constants/achievements/achievementInfo';
import Direction from '@root/constants/direction';
import getDifficultyEstimate from '@root/helpers/getDifficultyEstimate';
import PlayAttempt from '@root/models/db/playAttempt';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import Discord from '../../../constants/discord';
import { ValidArray, ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import { createNewRecordOnALevelYouSolvedNotifications } from '../../../helpers/notificationHelper';
import validateSolution, { randomRotateLevelDataViaMatchHash } from '../../../helpers/validateSolution';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level, { EnrichedLevel } from '../../../models/db/level';
import Record from '../../../models/db/record';
import Stat from '../../../models/db/stat';
import { LevelModel, PlayAttemptModel, RecordModel, StatModel, UserModel } from '../../../models/mongoose';
import { queueRefreshAchievements, queueRefreshIndexCalcs } from '../internal-jobs/worker';
import { matchMarkCompleteLevel } from '../match/[matchId]';

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
    const stats = await StatModel.find({ userId: new Types.ObjectId(req.userId), isDeleted: { $ne: true } }).lean<Stat[]>();

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

    const ts = TimerUtil.getTs();
    const session = await mongoose.startSession();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resTrack = { status: 500, json: { error: 'Internal server error' } as any };

    try {
      await session.withTransaction(async () => {
        const level = await LevelModel.findOne({ _id: levelId, isDeleted: { $ne: true } }, {}, { session: session }).lean<Level>();

        if (!level) {
          resTrack.status = 404;
          resTrack.json.error = `Error finding level ${levelId}`;
          throw new Error(resTrack.json.error);
        }

        if (level.isDraft && level.userId.toString() !== req.userId) {
          resTrack.status = 401;
          resTrack.json.error = `Unauthorized access for level ${levelId}`;
          throw new Error(resTrack.json.error);
        }

        if (matchId) {
          randomRotateLevelDataViaMatchHash(level, matchId);
        }

        if (!validateSolution(directions, level)) {
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

          return;
        }

        const complete = moves <= level.leastMoves;

        if (complete && matchId) {
          // TODO: use session here
          await matchMarkCompleteLevel(req.user._id, matchId, level._id);
        }

        const stat = await StatModel.findOne({ levelId: level._id, userId: req.user._id }, {}, { session: session }).lean<Stat>();

        // level was previously solved and no personal best was set, only need to $inc attempts and return
        if (stat && moves >= stat.moves) {
          await StatModel.updateOne({ _id: stat._id }, { $inc: { attempts: 1 } }, { session: session });

          return;
        }

        // track the new personal best in a stat
        if (!stat) {
          await StatModel.create([{
            _id: new Types.ObjectId(),
            attempts: 1,
            complete: complete,
            gameId: level.gameId,
            levelId: level._id,
            moves: moves,
            ts: ts,
            userId: req.user._id,
          }], { session: session });
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
          return;
        }

        // if the level was previously incomplete, increment score
        if (!stat?.complete) {
          await Promise.all([
            UserModel.updateOne({ _id: req.userId }, { $inc: { score: 1 } }, { session: session }),
            queueRefreshAchievements(req.user._id, [AchievementCategory.SKILL, AchievementCategory.USER], { session: session })
          ]);
        }

        const newRecord = moves < level.leastMoves;
        let incPlayattemptsDurationSum = 0;

        if (newRecord) {
          const prevRecord = await RecordModel.findOne<Record>({ levelId: level._id }, {}, { session: session }).sort({ ts: -1 });

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

          await RecordModel.create([{
            _id: new Types.ObjectId(),
            gameId: level.gameId,
            levelId: level._id,
            moves: moves,
            ts: ts,
            userId: req.user._id,
          }], { session: session });

          // find the stats and users that that need to be updated
          const stats = await StatModel.find({
            complete: true,
            levelId: level._id,
            userId: { $ne: req.userId },
          }, 'userId', {
            session: session,
          }).lean<Stat[]>();

          // update all stats/users that had the record on this level
          if (stats.length > 0) {
            const statUserIds = stats.map(s => s.userId);

            await Promise.all([
              StatModel.updateMany(
                { _id: { $in: stats.map(s => s._id) } },
                { $set: { complete: false } },
                { session: session },
              ),
              UserModel.updateMany(
                { _id: { $in: statUserIds } },
                { $inc: { score: -1 } },
                { session: session },
              ),
              createNewRecordOnALevelYouSolvedNotifications(statUserIds, req.userId, level._id, moves.toString(), { session: session })
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
          await Promise.all([PlayAttemptModel.updateMany(
            { levelId: level._id },
            { $set: { attemptContext: AttemptContext.UNSOLVED } },
            { session: session },
          ),
          queueDiscordWebhook(Discord.LevelsId, `**${req.user.name}** set a new record: [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts}) - ${moves} moves`, { session: session })
          ]);
        }

        // extend the user's recent playattempt up to current ts
        const found = await PlayAttemptModel.findOneAndUpdate({
          endTime: { $gt: ts - 3 * 60 },
          levelId: level._id,
          userId: req.user._id,
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
            gameId: level.gameId,
            startTime: ts,
            endTime: ts,
            updateCount: 0,
            levelId: level._id,
            userId: req.user._id,
          }], { session: session });
        } else {
          incPlayattemptsDurationSum += ts - found.endTime;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const levelUpdate: mongoose.AnyKeys<any> = {
          $addToSet: {
            calc_playattempts_unique_users: req.user._id,
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

    return res.status(resTrack.status).json(resTrack.json);
  }
});
