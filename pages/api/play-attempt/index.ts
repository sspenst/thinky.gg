import PlayAttempt from '@root/models/db/playAttempt';
import mongoose, { PipelineStage, Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { ValidEnum, ValidObjectId } from '../../../helpers/apiWrapper';
import { getEnrichLevelsPipelineSteps } from '../../../helpers/enrich';
import getDifficultyEstimate from '../../../helpers/getDifficultyEstimate';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel, PlayAttemptModel, UserModel } from '../../../models/mongoose';
import { LEVEL_DEFAULT_PROJECTION } from '../../../models/schemas/levelSchema';
import { AttemptContext } from '../../../models/schemas/playAttemptSchema';
import UserSchema, { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';

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
        from: LevelModel.collection.name,
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
        from: UserModel.collection.name,
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
    const levelObjectId = new Types.ObjectId(levelId);
    const now = TimerUtil.getTs();
    const session = await mongoose.startSession();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resTrack = { status: 500, json: { error: 'Error in POST play-attempt' } as any };

    try {
      await session.withTransaction(async () => {
        const latestPlayAttempt = await PlayAttemptModel.findOne<PlayAttempt>(
          {
            isDeleted: { $ne: true },
            levelId: levelObjectId,
            userId: req.user._id,
          },
          {
            _id: 1,
            attemptContext: 1,
            endTime: 1,
          },
          {
            lean: true,
            session: session,
            $sort: {
              endTime: -1,
              // NB: if end time is identical, we want to get the highest attempt context (JUST_BEATEN over UNBEATEN)
              attemptContext: -1,
            },
          },
        );

        if (!latestPlayAttempt) {
          // there is no playattempt yet, so need to check if the level exists before continuing
          const level = await LevelModel.findOne<EnrichedLevel>(
            {
              _id: levelObjectId,
              isDeleted: { $ne: true },
              isDraft: false,
            },
            {
              userId: 1,
            },
            {
              lean: true,
              session: session,
            },
          );

          if (!level) {
            resTrack.status = 404;
            resTrack.json.error = `Level ${levelId} not found`;
            throw new Error(resTrack.json.error);
          }

          // create the user's first playattempt for this level and return
          const resp = await PlayAttemptModel.create([{
            _id: new Types.ObjectId(),
            attemptContext: level.userId.toString() === req.userId ? AttemptContext.BEATEN : AttemptContext.UNBEATEN,
            endTime: now,
            levelId: levelObjectId,
            startTime: now,
            updateCount: 0,
            userId: req.user._id,
          }], { session: session });

          resTrack.status = 200;
          resTrack.json = { message: 'created', playAttempt: resp[0]._id };

          return;
        }

        if (latestPlayAttempt.endTime > (now - 3 * 60) && latestPlayAttempt.attemptContext !== AttemptContext.JUST_BEATEN) {
          // extend recent playattempts
          await PlayAttemptModel.updateOne(
            { _id: latestPlayAttempt._id },
            {
              $inc: { updateCount: 1 },
              $set: { endTime: now },
            },
            { session: session },
          );

          // increment the level's calc_playattempts_duration_sum
          if (latestPlayAttempt.attemptContext === AttemptContext.UNBEATEN) {
            const newPlayDuration = now - latestPlayAttempt.endTime;

            const updatedLevel = await LevelModel.findByIdAndUpdate<EnrichedLevel>(levelObjectId, {
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
              resTrack.status = 404;
              resTrack.json.error = `Level ${levelId} not found`;
              throw new Error(resTrack.json.error);
            }

            await LevelModel.updateOne({ _id: levelObjectId }, {
              $set: {
                calc_difficulty_estimate: getDifficultyEstimate(updatedLevel, updatedLevel.calc_playattempts_unique_users_count ?? 0),
              },
            }, {
              lean: true,
              session: session,
            });
          }

          resTrack.status = 200;
          resTrack.json = { message: 'updated', playAttempt: latestPlayAttempt._id };

          return;
        }

        const resp = await PlayAttemptModel.create([{
          _id: new Types.ObjectId(),
          attemptContext: latestPlayAttempt.attemptContext === AttemptContext.UNBEATEN ? AttemptContext.UNBEATEN : AttemptContext.BEATEN,
          endTime: now,
          levelId: levelObjectId,
          startTime: now,
          updateCount: 0,
          userId: req.user._id,
        }], { session: session });

        resTrack.status = 200;
        resTrack.json = { message: 'created', playAttempt: resp[0]._id };
      });
    } catch (err) {
      logger.error('Error in api/play-attempt', err);
    }

    session.endSession();

    return res.status(resTrack.status).json(resTrack.json);
  }
});
