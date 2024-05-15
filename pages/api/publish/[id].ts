import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { GameId } from '@root/constants/GameId';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import isFullAccount from '@root/helpers/isFullAccount';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import { ValidObjectId } from '../../../helpers/apiWrapper';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel, RecordModel, StatModel, UserConfigModel } from '../../../models/mongoose';
import { queueCalcCreatorCounts, queueCalcPlayAttempts, queueGenLevelImage, queueRefreshAchievements, queueRefreshIndexCalcs } from '../internal-jobs/worker';

export async function checkPublishRestrictions(gameId: GameId, userId: Types.ObjectId) {
  // check last 24h
  const ts = TimerUtil.getTs() - 60 * 60 * 24;
  const recentPublishedLevels = await LevelModel.find<Level>({
    isDraft: false,
    ts: { $gt: ts },
    userId: userId,
    gameId: gameId
  }).sort({ ts: -1 });

  if (recentPublishedLevels.length > 0) {
    const lastPublishedTs = recentPublishedLevels[0].ts;

    const now = TimerUtil.getTs();

    if (now - lastPublishedTs < 60) {
      return 'Please wait a little bit before publishing another level';
    }

    if (recentPublishedLevels.length >= 5) {
      const totalScore = recentPublishedLevels.map(l => l.calc_reviews_score_laplace).reduce((p, c) => p + c, 0);

      if (totalScore / recentPublishedLevels.length < 0.5) {
        return 'Your recent levels are getting poor reviews. Please wait before publishing a new level';
      }
    }
  }

  return undefined;
}

export default withAuth({ POST: {
  query: {
    id: ValidObjectId(),
  },
} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!isFullAccount(req.user)) {
    return res.status(401).json({
      error: 'Publishing a level requires a full account with a confirmed email'
    });
  }

  const { id } = req.query;

  await dbConnect();

  const level = await LevelModel.findOne<Level>({
    _id: id,
    userId: req.userId,
    // gameId: gameId
  }).lean<Level>();

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  const gameId = getGameIdFromReq(req);
  const game = getGameFromId(gameId);

  if (game.validateLevel) {
    const validateLevelResult = game.validateLevel(level.data);

    if (validateLevelResult.valid === false) {
      return res.status(400).json({
        error: validateLevelResult.reasons.join(', '),
      });
    }
  }

  if (level.leastMoves === 0) {
    return res.status(400).json({
      error: 'You must set a move count before publishing',
    });
  }

  if (level.leastMoves > 2500) {
    return res.status(400).json({
      error: 'Move count cannot be greater than 2500',
    });
  }

  // TODO: These queries can probably be combined into one query
  if (await LevelModel.findOne({
    data: level.data,
    isDeleted: { $ne: true },
    isDraft: false,
    gameId: level.gameId,
  })) {
    return res.status(400).json({
      error: 'An identical level already exists',
    });
  }

  if (await LevelModel.findOne({
    isDeleted: { $ne: true },
    isDraft: false,
    name: level.name,
    userId: req.userId,
    gameId: level.gameId,
  })) {
    return res.status(400).json({
      error: 'A level with this name already exists',
    });
  }

  const error = await checkPublishRestrictions(level.gameId, req.user._id);

  if (error) {
    return res.status(400).json({
      error: error,
    });
  }

  const ts = TimerUtil.getTs();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const [updatedLevel] = await Promise.all([
        LevelModel.findOneAndUpdate<Level>({ _id: id, isDraft: true }, {
          $set: {
            calc_stats_completed_count: 1,
            calc_stats_players_beaten: 1,
            isDraft: false,
            ts: ts,
          },
        }, { session: session, new: true }),
        UserConfigModel.findOneAndUpdate({ userId: req.userId, gameId: level.gameId }, {
          $inc: { calcLevelsSolvedCount: 1, calcLevelsCompletedCount: 1 },
        }, { session: session }).lean<User>(),
        RecordModel.create([{
          _id: new Types.ObjectId(),
          gameId: level.gameId,
          levelId: level._id,
          moves: level.leastMoves,
          ts: ts,
          userId: new Types.ObjectId(req.userId),
        }], { session: session }),
        StatModel.create([{
          _id: new Types.ObjectId(),
          attempts: 1,
          complete: true,
          gameId: level.gameId,
          levelId: level._id,
          moves: level.leastMoves,
          ts: ts,
          userId: new Types.ObjectId(req.userId),
        }], { session: session }),

      ]);

      if (!updatedLevel) {
        throw new Error('Level not found [RC]');
      }

      await Promise.all([
        queueRefreshAchievements(level.gameId, req.user._id, [AchievementCategory.CREATOR], { session: session }),
        queueRefreshIndexCalcs(level._id, { session: session }),
        queueCalcPlayAttempts(level._id, { session: session }),
        queueCalcCreatorCounts(level.gameId, req.user._id, { session: session }),
        queueGenLevelImage(level._id, true, { session: session }),
      ]);
    });
    session.endSession();
  } catch (err) {
    logger.error(err);
    session.endSession();

    return res.status(500).json({
      error: 'Error in publishing level',
    });
  }

  return res.status(200).json(level);
});
