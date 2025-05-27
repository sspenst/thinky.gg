import getDifficultyEstimate, { getDifficultyCompletionEstimate } from '@root/helpers/getDifficultyEstimate';
import { TimerUtil } from '@root/helpers/getTs';
import { logger } from '@root/helpers/logger';
import Level, { EnrichedLevel } from '@root/models/db/level';
import PlayAttempt from '@root/models/db/playAttempt';
import Stat from '@root/models/db/stat';
import { LevelModel, PlayAttemptModel, StatModel } from '@root/models/mongoose';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import mongoose, { Types } from 'mongoose';

export async function postPlayAttempt(userId: Types.ObjectId, levelId: string) {
  const levelObjectId = new Types.ObjectId(levelId);
  const now = TimerUtil.getTs();
  const session = await mongoose.startSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resTrack = { status: 500, json: { error: 'Error in POST play-attempt' } as any };

  try {
    await session.withTransaction(async () => {
      const latestPlayAttempt = await PlayAttemptModel.findOne(
        {
          levelId: levelObjectId,
          userId: userId,
          isDeleted: { $ne: true },
          // dont need gameId here because we're already filtering by levelId
        },
        {
          _id: 1,
          attemptContext: 1,
          gameId: 1,
          endTime: 1,
        },
        {
          session: session,
          $sort: {
            endTime: -1,
            // NB: if end time is identical, we want to get the highest attempt context (JUST_SOLVED over UNSOLVED)
            attemptContext: -1,
          },
        }
      ).lean<PlayAttempt>();

      if (!latestPlayAttempt) {
        // there is no playattempt yet, so need to check if the level exists before continuing
        const level = await LevelModel.findOne(
          {
            _id: levelObjectId,
            isDeleted: { $ne: true },
            isDraft: false,
          },
          {
            userId: 1,
            gameId: 1
          },
          {
            session: session,
          }
        ).lean<EnrichedLevel>();

        if (!level) {
          resTrack.status = 404;
          resTrack.json.error = `Level ${levelId} not found`;

          throw new Error(resTrack.json.error);
        }

        // create the user's first playattempt for this level and return
        const resp = await PlayAttemptModel.create([{
          _id: new Types.ObjectId(),
          attemptContext: level.userId.toString() === userId.toString() ? AttemptContext.SOLVED : AttemptContext.UNSOLVED,
          endTime: now,
          gameId: level.gameId,
          levelId: levelObjectId,
          startTime: now,
          updateCount: 0,
          userId: userId,
        }], { session: session });

        resTrack.status = 200;
        resTrack.json = { message: 'created', playAttempt: resp[0]._id };

        return;
      }

      if (latestPlayAttempt.endTime > (now - 3 * 60) && latestPlayAttempt.attemptContext !== AttemptContext.JUST_SOLVED) {
        // extend recent playattempts
        await PlayAttemptModel.updateOne(
          { _id: latestPlayAttempt._id },
          {
            $inc: { updateCount: 1 },
            $set: { endTime: now },
          },
          { session: session }
        );

        // increment the level's calc_playattempts_duration_sum
        if (latestPlayAttempt.attemptContext === AttemptContext.UNSOLVED) {
          const newPlayDuration = now - latestPlayAttempt.endTime;

          const levelInc = {
            calc_playattempts_duration_sum: newPlayDuration,
          } as Partial<Level>;

          const stat = await StatModel.findOne({
            levelId: levelObjectId,
            userId: userId,
          }, '_id', { session: session }).lean<Stat>();

          // if the level has not yet been beaten, increment calc_playattempts_duration_before_stat_sum
          if (!stat) {
            levelInc.calc_playattempts_duration_before_stat_sum = newPlayDuration;
          }

          // Helper function to calculate solve count factor (from getDifficultyEstimate.ts)
          const getSolveCountFactorExpression = (solveCount: any) => ({
            $add: [
              {
                $divide: [
                  { $subtract: [1.5, 1] }, // k - 1
                  {
                    $add: [
                      1,
                      {
                        $exp: {
                          $multiply: [
                            0.2, // t
                            { $subtract: [solveCount, 20] } // solveCount - m
                          ]
                        }
                      }
                    ]
                  }
                ]
              },
              1
            ]
          });

          // Use aggregation pipeline to update everything in one operation
          const pipeline = [
            {
              $set: {
                // First increment the duration sums and add user to unique users
                calc_playattempts_duration_sum: { $add: ['$calc_playattempts_duration_sum', newPlayDuration] },
                ...(levelInc.calc_playattempts_duration_before_stat_sum && {
                  calc_playattempts_duration_before_stat_sum: { $add: ['$calc_playattempts_duration_before_stat_sum', newPlayDuration] }
                }),
                calc_playattempts_unique_users: { $setUnion: ['$calc_playattempts_unique_users', [userId]] },
              }
            },
            {
              $set: {
                // Calculate the user counts after adding the user
                calc_playattempts_unique_users_count: { $size: '$calc_playattempts_unique_users' },
                calc_playattempts_unique_users_count_excluding_author: { $size: { $setDifference: ['$calc_playattempts_unique_users', ['$userId']] } },
              }
            },
            {
              $set: {
                // Calculate difficulty estimates inline
                calc_difficulty_estimate: {
                  $cond: {
                    if: {
                      $and: [
                        { $gte: ['$calc_playattempts_unique_users_count', 10] },
                        { $ne: ['$calc_playattempts_duration_sum', null] }
                      ]
                    },
                    then: {
                      $let: {
                        vars: {
                          solveCount: {
                            $cond: {
                              if: { $gt: ['$calc_playattempts_just_beaten_count', 0] },
                              then: '$calc_playattempts_just_beaten_count',
                              else: 1
                            }
                          }
                        },
                        in: {
                          $multiply: [
                            { $divide: ['$calc_playattempts_duration_sum', '$$solveCount'] },
                            getSolveCountFactorExpression('$$solveCount')
                          ]
                        }
                      }
                    },
                    else: -1
                  }
                },
                calc_difficulty_completion_estimate: {
                  $cond: {
                    if: {
                      $and: [
                        { $gte: ['$calc_playattempts_unique_users_count_excluding_author', 10] },
                        { $ne: ['$calc_playattempts_duration_before_stat_sum', null] }
                      ]
                    },
                    then: {
                      $let: {
                        vars: {
                          completedCount: {
                            $cond: {
                              if: { $gt: [{ $subtract: [{ $ifNull: ['$calc_stats_completed_count', 0] }, 1] }, 0] },
                              then: { $subtract: [{ $ifNull: ['$calc_stats_completed_count', 0] }, 1] },
                              else: 1
                            }
                          }
                        },
                        in: {
                          $multiply: [
                            { $divide: ['$calc_playattempts_duration_before_stat_sum', '$$completedCount'] },
                            getSolveCountFactorExpression('$$completedCount')
                          ]
                        }
                      }
                    },
                    else: -1
                  }
                }
              }
            }
          ];

          const updatedLevel = await LevelModel.findByIdAndUpdate(
            levelObjectId,
            pipeline,
            {
              new: true,
              projection: {
                calc_playattempts_duration_before_stat_sum: 1,
                calc_playattempts_duration_sum: 1,
                calc_playattempts_just_beaten_count: 1,
                calc_playattempts_unique_users_count: 1,
                calc_playattempts_unique_users_count_excluding_author: 1,
                calc_stats_completed_count: 1,
                calc_difficulty_estimate: 1,
                calc_difficulty_completion_estimate: 1,
              },
              session: session,
            }
          ).lean<EnrichedLevel>();

          if (!updatedLevel) {
            resTrack.status = 404;
            resTrack.json.error = `Level ${levelId} not found`;
            throw new Error(resTrack.json.error);
          }
        }

        resTrack.status = 200;
        resTrack.json = { message: 'updated', playAttempt: latestPlayAttempt._id };

        return;
      }

      const resp = await PlayAttemptModel.create([{
        _id: new Types.ObjectId(),
        attemptContext: latestPlayAttempt.attemptContext === AttemptContext.UNSOLVED ? AttemptContext.UNSOLVED : AttemptContext.SOLVED,
        endTime: now,
        gameId: latestPlayAttempt.gameId,
        levelId: levelObjectId,
        startTime: now,
        updateCount: 0,
        userId: userId,
      }], { session: session });

      resTrack.status = 200;
      resTrack.json = { message: 'created', playAttempt: resp[0]._id };
    });
  } catch (err) {
    logger.error('Error in api/play-attempt', err);
  }

  session.endSession();

  return resTrack;
}
