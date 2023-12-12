import { AchievementCategory } from '@root/constants/achievements/achievementInfo';
import TileType from '@root/constants/tileType';
import isFullAccount from '@root/helpers/isFullAccount';
import mongoose, { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import Discord from '../../../constants/discord';
import { ValidObjectId } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import { createNewLevelNotifications } from '../../../helpers/notificationHelper';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel, RecordModel, StatModel, UserModel } from '../../../models/mongoose';
import { queueCalcCreatorCounts, queueCalcPlayAttempts, queueRefreshAchievements, queueRefreshIndexCalcs } from '../internal-jobs/worker';

export async function checkPublishRestrictions(userId: Types.ObjectId) {
  // check last 24h
  const ts = TimerUtil.getTs() - 60 * 60 * 24;
  const recentPublishedLevels = await LevelModel.find<Level>({
    isDraft: false,
    ts: { $gt: ts },
    userId: userId,
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
  }).lean<Level>();

  if (!level) {
    return res.status(404).json({
      error: 'Level not found',
    });
  }

  if ((level.data.match(new RegExp(TileType.Start, 'g')) || []).length !== 1) {
    return res.status(400).json({
      error: 'There must be exactly one start block',
    });
  }

  if ((level.data.match(new RegExp(TileType.End, 'g')) || []).length === 0) {
    return res.status(400).json({
      error: 'There must be at least one end block',
    });
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

  if (await LevelModel.findOne({
    data: level.data,
    isDeleted: { $ne: true },
    isDraft: false,
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
  })) {
    return res.status(400).json({
      error: 'A level with this name already exists',
    });
  }

  const error = await checkPublishRestrictions(req.user._id);

  if (error) {
    return res.status(400).json({
      error: error,
    });
  }

  const ts = TimerUtil.getTs();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const [user, updatedLevel] = await Promise.all([
        UserModel.findOneAndUpdate({ _id: req.userId }, {
          $inc: { score: 1 },
        }, { session: session }).lean<User>(),
        LevelModel.findOneAndUpdate<Level>({ _id: id, isDraft: true }, {
          $set: {
            isDraft: false,
            ts: ts,
          },
        }, { session: session, new: true }),
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
        queueCalcCreatorCounts(req.user._id, { session: session }),
        createNewLevelNotifications(level.gameId, new Types.ObjectId(req.userId), level._id, undefined, { session: session }),
        queueDiscordWebhook(Discord.Levels, `**${user?.name}** published a new level: [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts})`, { session: session }),
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
