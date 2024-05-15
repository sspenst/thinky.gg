import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import isCurator from '@root/helpers/isCurator';
import isFullAccount from '@root/helpers/isFullAccount';
import cleanReview from '@root/lib/cleanReview';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import DiscordChannel from '../../../constants/discordChannel';
import NotificationType from '../../../constants/notificationType';
import { ValidNumber, ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import { clearNotifications, createNewReviewOnYourLevelNotification } from '../../../helpers/notificationHelper';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import Review from '../../../models/db/review';
import { LevelModel, ReviewModel, UserModel } from '../../../models/mongoose';
import { queueRefreshAchievements, queueRefreshIndexCalcs } from '../internal-jobs/worker';

export function getScoreEmojis(score: number) {
  return '<:fullstar:1045889520001892402>'.repeat(Math.floor(score)) + (Math.floor(score) !== score ? '<:halfstar:1045889518701654046>' : '');
}

function generateDiscordWebhook(
  lastTs: number | undefined,
  level: Level,
  req: NextApiRequestWithAuth,
  score: number,
  text: string | undefined,
  ts: number
) {
  // 1. must be a review with text
  // 2. if a review is being updated, must wait at least an hour until we show another notification
  if (!text || (lastTs && lastTs + 60 * 60 > ts)) {
    return Promise.resolve();
  }

  let slicedText = text.slice(0, 300);

  if (slicedText.length < text.length) {
    slicedText = slicedText.concat('...');
  }

  // remove spoilers
  const cleanedText = cleanReview(false, null, { text: slicedText, userId: req.user } as Review);
  // Remove any links from the text. So anything starting with anything:// we should just remove the anything://
  const contentCleaned = cleanedText?.replace(/\w+:\/{2}[\d\w-]+(\.[\d\w-]+)*(?:(?:\/[^\s/]*))*/g, '[link]');

  const game = getGameFromId(level.gameId);
  const discordChannel = game.id === GameId.SOKOPATH ? DiscordChannel.SokopathNotifs : DiscordChannel.PathologyNotifs;
  const discordTxt = `${score ? getScoreEmojis(score) + ' - ' : ''}**${req.user?.name}** wrote a review for ${level.userId.name}'s [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts}):\n${contentCleaned}`;

  return queueDiscordWebhook(discordChannel, discordTxt);
}

export default withAuth({
  POST: {
    body: {
      score: ValidNumber(true, 0, 5, 0.5),
      text: ValidType('string', false),
    },
    query: {
      id: ValidObjectId(),
    },
  },
  PUT: {
    body: {
      score: ValidNumber(true, 0, 5, 0.5),
      text: ValidType('string', false),
      userId: ValidObjectId(true),
    },
    query: {
      id: ValidObjectId(),
    },
  },
  DELETE: {
    query: {
      id: ValidObjectId(true),
      userId: ValidObjectId(true),
    },
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'POST') {
    if (!isFullAccount(req.user)) {
      return res.status(401).json({
        error: 'Reviewing requires a full account with a confirmed email'
      });
    }

    const { id } = req.query;
    const levels = await LevelModel.aggregate<Level>([
      {
        $match: {
          _id: new Types.ObjectId(id as string),
          isDeleted: { $ne: true },
          isDraft: false,
          gameId: req.gameId,
        }
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
          pipeline: [{
            $project: USER_DEFAULT_PROJECTION,
          }],
        },
      },
      {
        $unwind: '$userId',
      },
    ]);

    if (levels.length !== 1) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    const level = levels[0];
    const { score, text }: { score: number, text?: string } = req.body;
    const trimmedText = text?.trim();

    // cannot give a rating to your own level
    const authorId = level.archivedBy?.toString() ?? level.userId._id.toString();
    const setScore = authorId === req.userId ? 0 : score;

    if (setScore === 0 && (!trimmedText || trimmedText.length === 0)) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    // Check if a review was already created
    const existing = await ReviewModel.findOne({
      userId: req.userId,
      levelId: level._id,
    }).lean<Review>();

    if (existing) {
      return res.status(400).json({
        error: 'You already reviewed this level',
      });
    }

    const ts = TimerUtil.getTs();

    const review = await ReviewModel.create({
      _id: new Types.ObjectId(),
      gameId: level.gameId,
      levelId: id,
      score: setScore,
      text: !trimmedText ? undefined : trimmedText,
      ts: ts,
      userId: req.userId,
    });

    await Promise.all([
      queueRefreshAchievements(level.gameId, req.user._id, [AchievementCategory.REVIEWER]),
      queueRefreshAchievements(level.gameId, level.userId._id, [AchievementCategory.CREATOR]),
      generateDiscordWebhook(undefined, level, req, setScore, trimmedText, ts),
      queueRefreshIndexCalcs(new Types.ObjectId(id?.toString())),
      createNewReviewOnYourLevelNotification(level.gameId, level.userId._id, req.userId, level._id, String(setScore), !!trimmedText),
    ]);

    return res.status(200).json(review);
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const levels = await LevelModel.aggregate<Level>([
      {
        $match: {
          _id: new Types.ObjectId(id as string),
          isDeleted: { $ne: true },
          // TODO: Do we need to filter out drafts here?
          gameId: req.gameId,
        }
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
          pipeline: [{
            $project: USER_DEFAULT_PROJECTION,
          }],
        },
      },
      {
        $unwind: '$userId',
      },
    ]);

    if (levels.length !== 1) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    const level = levels[0];
    const { score, text, userId } = req.body;
    const trimmedText = text?.trim();

    // cannot give a rating to your own level
    const authorId = level.archivedBy?.toString() ?? level.userId._id.toString();
    const setScore = authorId === req.userId ? 0 : score;

    if (setScore === 0 && (!trimmedText || trimmedText.length === 0)) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    if (!isCurator(req.user) && userId !== req.userId) {
      return res.status(403).json({
        error: 'Not authorized to edit this review',
      });
    }

    const ts = TimerUtil.getTs();

    // NB: setting text to undefined isn't enough to delete it from the db;
    // need to also unset the field to delete it completely
    const update = {
      $set: {
        score: setScore,
        text: !trimmedText ? undefined : trimmedText,
        ts: ts,
      },
      $unset: {},
    };

    if (!trimmedText) {
      update.$unset = {
        text: '',
      };
    }

    try {
      const review = await ReviewModel.findOneAndUpdate<Review>({
        levelId: new Types.ObjectId(id as string),
        userId: new Types.ObjectId(userId),
      }, update, { new: true, runValidators: true });

      if (!review) {
        return res.status(404).json({
          error: 'Error finding Review',
        });
      }

      const promises = [
        queueRefreshAchievements(review.gameId, userId, [AchievementCategory.REVIEWER]),
        queueRefreshAchievements(review.gameId, level.userId._id, [AchievementCategory.CREATOR]),
        queueRefreshIndexCalcs(new Types.ObjectId(id?.toString())),
        createNewReviewOnYourLevelNotification(level.gameId, level.userId, userId, level._id, String(setScore), !!trimmedText),
      ];

      if (userId === req.userId) {
        promises.push(generateDiscordWebhook(review.ts, level, req, setScore, trimmedText, ts));
      }

      await Promise.all(promises);

      return res.status(200).json(review);
    } catch (err) {
      logger.error(err);

      return res.status(500).json({
        error: 'Error updating review',
      });
    }
  } else if (req.method === 'DELETE') {
    const { id, userId } = req.query as { id: string, userId: string };

    // delete all notifications around this type
    const level = await LevelModel.findById(id);

    if (!level) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    if (!isCurator(req.user) && userId !== req.userId) {
      return res.status(403).json({
        error: 'Not authorized to delete this review',
      });
    }

    try {
      await ReviewModel.deleteOne({
        levelId: new Types.ObjectId(id as string),
        userId: new Types.ObjectId(userId),
      });

      await Promise.all([
        queueRefreshAchievements(level.gameId, userId, [AchievementCategory.REVIEWER]),
        queueRefreshAchievements(level.gameId, level.userId._id, [AchievementCategory.CREATOR]),
        queueRefreshIndexCalcs(new Types.ObjectId(id?.toString())),
        clearNotifications(level.userId._id, userId, level._id, NotificationType.NEW_REVIEW_ON_YOUR_LEVEL),
      ]);

      return res.status(200).json({ success: true });
    } catch (err) {
      logger.error(err);

      return res.status(500).json({
        error: 'Error deleting review',
      });
    }
  }
});
