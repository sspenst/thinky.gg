import mongoose, { PipelineStage, QueryOptions, Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { ValidEnum, ValidObjectId } from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import getDifficultyEstimate from '../../../helpers/getDifficultyEstimate';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel, PlayAttemptModel, StatModel } from '../../../models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { AttemptContext } from '../../../models/schemas/playAttemptSchema';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

const MINUTE = 60;

export async function getLastLevelPlayed(user: User) {
  const lastAgg = await PlayAttemptModel.aggregate([
    // find the latest playattempt
    {
      $match: {
        isDeleted: { $ne: true },
        userId: user._id,
      },
    },
    {
      $sort: {
        endTime: -1,
        // NB: if end time is identical, we want to get the highest attempt context (JUST_BEATEN over UNBEATEN)
        attemptContext: -1,
      },
    },
    {
      $project: {
        levelId: 1,
        attemptContext: 1,
      }
    },
    {
      $limit: 1,
    },
    // we only want to show the playattempt if the level is still unbeaten
    {
      $match: {
        attemptContext: AttemptContext.UNBEATEN,
      }
    },
    {
      $lookup: {
        from: 'levels',
        localField: 'levelId',
        foreignField: '_id',
        as: 'levelId',
        pipeline: [
          { $match: { isDeleted: { $ne: true } } },
          {
            $project: {
              ...LEVEL_DEFAULT_PROJECTION
            }
          },
          ...getEnrichLevelsPipelineSteps(user, '_id', '') as PipelineStage.Lookup[]
        ]
      },
    },
    {
      $unwind: '$levelId',
    },
    {
      $lookup: {
        from: 'users',
        localField: 'levelId.userId',
        foreignField: '_id',
        as: 'levelId.userId',
        pipeline: [
          {
            $project: {
              ...USER_DEFAULT_PROJECTION
            }
          }
        ]
      },
    },
    {
      $unwind: '$levelId.userId',
    },
    {
      $replaceRoot: {
        newRoot: '$levelId',
      }
    },
  ]);

  if (lastAgg.length === 0) {
    return null;
  }

  return lastAgg[0] as EnrichedLevel;
}

export async function forceCompleteLatestPlayAttempt(userId: string, levelId: string, ts: number, opts: QueryOptions) {
  const found = await PlayAttemptModel.findOneAndUpdate({
    userId: userId,
    levelId: levelId,
    endTime: { $gt: ts - 3 * MINUTE },
  }, {
    $set: {
      attemptContext: AttemptContext.JUST_BEATEN,
      endTime: ts,
    },
    $inc: { updateCount: 1 }
  }, {
    new: false,
    sort: { _id: -1 },
    lean: true,
    ...opts,
  });

  if (!found) {
    // create one if it did not exist... rare but technically possible
    await PlayAttemptModel.create([{
      _id: new Types.ObjectId(),
      attemptContext: AttemptContext.JUST_BEATEN,
      startTime: ts,
      endTime: ts,
      updateCount: 0,
      levelId: new Types.ObjectId(levelId),
      userId: new Types.ObjectId(userId),
    }], { ...opts });
  }

  const level = await LevelModel.findByIdAndUpdate<EnrichedLevel>(levelId, {
    $inc: {
      calc_playattempts_duration_sum: found ? ts - found.endTime : 0,
      calc_playattempts_just_beaten_count: 1,
    },
    $addToSet: {
      calc_playattempts_unique_users: new Types.ObjectId(userId),
    },
  }, {
    new: true,
    lean: true,
    projection: {
      calc_playattempts_duration_sum: 1,
      calc_playattempts_just_beaten_count: 1,
      calc_playattempts_unique_users_count: { $size: '$calc_playattempts_unique_users' },
    },
    ...opts,
  });

  if (!level) {
    throw new Error('Level ' + levelId + ' not found within transaction');
  }

  await LevelModel.findByIdAndUpdate(levelId, {
    $set: {
      calc_difficulty_estimate: getDifficultyEstimate(level, level.calc_playattempts_unique_users_count ?? 0),
    },
  }, opts);
}

// This API extends an existing playAttempt, or creates a new one if the last
// playAttempt was over 15 minutes ago.
export default withAuth({
  GET: {
    query: {
      context: ValidEnum(['recent_unbeaten']),
    },
  },
  POST: {
    body: {
      levelId: ValidObjectId(),
    },
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const lastPlayed = await getLastLevelPlayed(req.user);

    return res.status(200).json(lastPlayed);
  } else if (req.method === 'POST') {
    const { levelId } = req.body;
    const now = TimerUtil.getTs();
    const session = await mongoose.startSession();
    let resTrack = { status: 500, data: {} };

    try {
      await session.withTransaction(async () => {
        const [playAttempt, level] = await Promise.all([
          PlayAttemptModel.findOneAndUpdate(
            {
              userId: req.user._id,
              levelId: levelId,
              endTime: { $gt: now - 3 * MINUTE },
              attemptContext: {
                $ne: AttemptContext.JUST_BEATEN
              }
            },
            {
              $set: { endTime: now },
              $inc: { updateCount: 1 },
            },
            {
              new: false,
              lean: true,
              session: session,
              projection: {
                _id: 1,
                attemptContext: 1,
                endTime: 1,
              },
              // NB: must update the latest one if there are multiple options, otherwise time ranges will overlap
              sort: { _id: -1 },
            },
          ),
          LevelModel.findOne<EnrichedLevel>(
            {
              _id: levelId,
              isDeleted: { $ne: true },
              isDraft: false,
            },
            {
              calc_playattempts_duration_sum: 1,
              calc_playattempts_just_beaten_count: 1,
              calc_playattempts_unique_users_count: { $size: '$calc_playattempts_unique_users' },
            },
            {
              lean: true,
              session: session,
            },
          ),
        ]);

        if (!level) {
          resTrack = { status: 404, data: { error: 'Level not found' } };
          throw new Error('Level ' + levelId + ' not found within transaction');
        }

        if (playAttempt) {
          // increment the level's calc_playattempts_duration_sum
          if (playAttempt.attemptContext !== AttemptContext.BEATEN) {
            const newPlayDuration = now - playAttempt.endTime;

            const updatedLevel = await LevelModel.findByIdAndUpdate<EnrichedLevel>(levelId, {
              $inc: {
                calc_playattempts_duration_sum: newPlayDuration,
              },
              $addToSet: {
                calc_playattempts_unique_users: req.user._id,
              },
            }, {
              new: true,
              lean: true,
              projection: {
                calc_playattempts_duration_sum: 1,
                calc_playattempts_just_beaten_count: 1,
                calc_playattempts_unique_users_count: { $size: '$calc_playattempts_unique_users' },
              },
              session: session,
            });

            if (!updatedLevel) {
              resTrack = { status: 500, data: { error: 'Level not found' } };
              throw new Error('Level ' + levelId + ' not found within transaction');
            }

            await LevelModel.updateOne({ _id: levelId }, {
              $set: {
                calc_difficulty_estimate: getDifficultyEstimate(updatedLevel, updatedLevel.calc_playattempts_unique_users_count ?? 0),
              },
            }, {
              lean: true,
              session: session,
            });
          }

          resTrack = { status: 200, data: { message: 'updated', playAttempt: playAttempt._id } };
        } else {
          const statRecord = await StatModel.findOne({
            userId: req.user._id,
            levelId: levelId,
          }, 'complete', { session: session, lean: true });

          const resp = await PlayAttemptModel.create([{
            _id: new Types.ObjectId(),
            userId: req.user._id,
            levelId: levelId,
            startTime: now,
            endTime: now,
            updateCount: 0,
            attemptContext: statRecord?.complete ? AttemptContext.BEATEN : AttemptContext.UNBEATEN,
          }], { session: session });

          resTrack = { status: 200, data: { message: 'created', playAttempt: resp[0]._id } };
        }
      });

      session.endSession();
    } catch (err) {
      logger.error('Error in api/playattempt', err);
      session.endSession();

      if (resTrack.status !== 500) {
        return res.status(resTrack.status).json(resTrack.data);
      }

      return res.status(500).json({
        error: 'Error in POST play-attempt',
      });
    }

    return res.status(resTrack.status).json(resTrack.data);
  }
});
