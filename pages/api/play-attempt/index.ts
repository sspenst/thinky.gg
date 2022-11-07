import { ObjectId } from 'bson';
import mongoose, { QueryOptions } from 'mongoose';
import { NextApiResponse } from 'next';
import { ValidEnum, ValidObjectId } from '../../../helpers/apiWrapper';
import { enrichLevels } from '../../../helpers/enrich';
import getDifficultyEstimate from '../../../helpers/getDifficultyEstimate';
import { TimerUtil } from '../../../helpers/getTs';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel, PlayAttemptModel, StatModel } from '../../../models/mongoose';
import { AttemptContext } from '../../../models/schemas/playAttemptSchema';

const MINUTE = 60;

export async function getLastLevelPlayed(user: User) {
  // Instead of the above, use aggregate.. quick benchmark showed this ~100ms faster
  const lastAgg = await PlayAttemptModel.aggregate([
    {
      $match: {
        userId: new ObjectId(user._id),
        updateCount: { $gt: 0 },
      },
    },
    {
      $sort: {
        endTime: -1,
      },
    },
    {
      $limit: 1,
    },
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
        as: 'level',
      },
    },
    {
      $unwind: '$level',
    },
    {
      $lookup: {
        from: 'users',
        localField: 'level.userId',
        foreignField: '_id',
        as: 'level.user',
      },
    },
    {
      $unwind: '$level.user',
    },
    {
      $project: {
        // put all under levelId object
        attemptContext: 1,
        levelId: {
          _id: '$level._id',
          name: '$level.name',
          slug: '$level.slug',
          leastMoves: '$level.leastMoves',
          data: '$level.data',
          width: '$level.width',
          height: '$level.height',
          userId: {
            _id: '$level.user._id',
            name: '$level.user.name',
          }
        }
      },
    },
  ]);

  if (lastAgg.length === 0) {
    return null;
  }

  const last = lastAgg[0];

  const enriched = await enrichLevels([last.levelId], user);

  return enriched[0];
}

export async function forceUpdateLatestPlayAttempt(userId: string, levelId: string, context: AttemptContext, ts: number, opts: QueryOptions) {
  const found = await PlayAttemptModel.findOneAndUpdate({
    userId: userId,
    levelId: levelId,
  }, {
    $set: {
      attemptContext: context,
      endTime: ts,
    },
    $inc: { updateCount: 1 }
  }, {
    new: false,
    sort: { _id: -1 },
    lean: true,
    ...opts,
  });

  let sumAdd = 0;

  if (found && context !== AttemptContext.BEATEN) {
    sumAdd = ts - found.endTime;
  }

  if (sumAdd || context === AttemptContext.JUST_BEATEN) {
    const level = await LevelModel.findByIdAndUpdate(levelId, {
      $inc: {
        calc_playattempts_duration_sum: sumAdd,
        calc_playattempts_just_beaten_count: context === AttemptContext.JUST_BEATEN ? 1 : 0,
      },
      $addToSet: {
        calc_playattempts_unique_users: new ObjectId(userId),
      }
    }, { new: true, ...opts });

    await LevelModel.findByIdAndUpdate(levelId, {
      $set: {
        calc_difficulty_estimate: getDifficultyEstimate(level, level.calc_playattempts_unique_users.length),
      },
    }, opts);
  }

  if (!found) {
    // create one if it did not exist... rare but technically possible
    await PlayAttemptModel.create([{
      _id: new ObjectId(),
      attemptContext: context,
      startTime: ts,
      endTime: ts,
      updateCount: 0,
      levelId: new ObjectId(levelId),
      userId: new ObjectId(userId),
    }], { ...opts });

    await LevelModel.findByIdAndUpdate(levelId, {
      $inc: {
        calc_playattempts_count: 1,
      },
    }, { lean: true, ...opts });
  }
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
    // find the last play attempt for this user and context
    const lastPlayed = await getLastLevelPlayed(req.user);

    if (!lastPlayed) {
      return res.status(200).json(null);
    }

    return res.status(200).json(lastPlayed);
  } else if (req.method === 'POST') {
    const { levelId } = req.body;

    await dbConnect();
    const now = TimerUtil.getTs();
    const session = await mongoose.startSession();

    // first don't do anything if user has already beaten this level
    const [level, playAttempt, statRecord] = await Promise.all([
      LevelModel.findById<Level & { calc_playattempts_unique_users_count: number }>(levelId,
        {
          isDraft: 1,
          calc_playattempts_duration_sum: 1,
          calc_playattempts_just_beaten_count: 1,
          calc_playattempts_unique_users_count: { $size: '$calc_playattempts_unique_users' },
        },
        { session: session, lean: true }),
      PlayAttemptModel.findOneAndUpdate({
        userId: req.user._id,
        levelId: levelId,
        endTime: { $gt: now - 15 * MINUTE },
        attemptContext: {
          $ne: AttemptContext.JUST_BEATEN
        }
      }, {
        $set: { endTime: now },
        $inc: { updateCount: 1 },
      }, {
        new: false,
        lean: true,
        session: session,
        projection: {
          _id: 1,
          attemptContext: 1,
          endTime: 1,
        }
      }),
      StatModel.findOne({
        userId: req.user._id,
        levelId: levelId,
      }, 'complete', { session: session, lean: true }),
    ]);

    if (!level || level.isDraft) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    if (playAttempt) {
    // increment the level's calc_playattempts_duration_sum
      if (playAttempt.attemptContext !== AttemptContext.BEATEN) {
        const newPlayDuration = now - playAttempt.endTime;

        // update level object for getDifficultyEstimate
        level.calc_playattempts_duration_sum += newPlayDuration;

        await LevelModel.findByIdAndUpdate(levelId, {
          $inc: {
            calc_playattempts_duration_sum: newPlayDuration,
          },
          $set: {
            calc_difficulty_estimate: getDifficultyEstimate(level, level.calc_playattempts_unique_users_count),
          },
        }, { session: session });
      }

      return res.status(200).json({
        message: 'updated',
        playAttempt: playAttempt._id,
      });
    }

    const resp = await PlayAttemptModel.create([{
      _id: new ObjectId(),
      userId: req.user._id,
      levelId: levelId,
      startTime: now,
      endTime: now,
      updateCount: 0,
      attemptContext: statRecord?.complete ? AttemptContext.BEATEN : AttemptContext.UNBEATEN,
    }], { session: session });

    // if it has been more than 15 minutes OR if we have no play attempt record create a new play attempt
    // increment the level's calc_playattempts_count
    let incr = {};

    if (!statRecord?.complete) {
      incr = { $inc: {
        calc_playattempts_count: 1,
      } };
    }

    await LevelModel.findByIdAndUpdate(levelId, {
      $addToSet: {
        calc_playattempts_unique_users: req.user._id,
      }, ...incr
    }, { session: session });

    return res.status(200).json({
      message: 'created',
      playAttempt: resp[0]._id,
    });
  }
});
