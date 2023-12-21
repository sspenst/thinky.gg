import getDifficultyEstimate from '@root/helpers/getDifficultyEstimate';
import { TimerUtil } from '@root/helpers/getTs';
import { logger } from '@root/helpers/logger';
import { EnrichedLevel } from '@root/models/db/level';
import PlayAttempt from '@root/models/db/playAttempt';
import { LevelModel, PlayAttemptModel } from '@root/models/mongoose';
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

        return resTrack;
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

          const updatedLevel = await LevelModel.findByIdAndUpdate(levelObjectId, {
            $inc: {
              calc_playattempts_duration_sum: newPlayDuration,
            },
            $addToSet: {
              calc_playattempts_unique_users: userId,
            },
          }, {
            new: true,
            projection: {
              calc_playattempts_duration_sum: 1,
              calc_playattempts_just_beaten_count: 1,
              calc_playattempts_unique_users_count: { $size: '$calc_playattempts_unique_users' },
            },
            session: session,
          }).lean<EnrichedLevel>();

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
            session: session,
          }).lean();
        }

        resTrack.status = 200;
        resTrack.json = { message: 'updated', playAttempt: latestPlayAttempt._id };

        return resTrack;
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
