import isFullAccount from '@root/helpers/isFullAccount';
import { Types } from 'mongoose';
import type { NextApiResponse } from 'next';
import Discord from '../../../constants/discord';
import NotificationType from '../../../constants/notificationType';
import { ValidNumber, ValidObjectId, ValidType } from '../../../helpers/apiWrapper';
import queueDiscordWebhook from '../../../helpers/discordWebhook';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import { clearNotifications, createNewReviewOnYourLevelNotification } from '../../../helpers/notificationHelper';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import Review from '../../../models/db/review';
import { LevelModel, ReviewModel } from '../../../models/mongoose';
import { USER_DEFAULT_PROJECTION } from '../../../models/schemas/userSchema';
import { queueRefreshIndexCalcs } from '../internal-jobs/worker';

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

  // Remove any links from the text. So anything starting with anything:// we should just remove the anything://
  const contentCleaned = slicedText.replace(/\w+:\/{2}[\d\w-]+(\.[\d\w-]+)*(?:(?:\/[^\s/]*))*/g, '[link]');
  const discordTxt = `${score ? getScoreEmojis(score) + ' - ' : ''}**${req.user?.name}** wrote a review for ${level.userId.name}'s [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts}):\n${contentCleaned}`;

  return queueDiscordWebhook(Discord.NotifsId, discordTxt);
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
    },
    query: {
      id: ValidObjectId(),
    },
  },
  DELETE: {
    query: {
      id: ValidObjectId(),
    },
  },
}, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'POST') {
    if (!(await isFullAccount(req.user))) {
      return res.status(401).json({
        error: 'Reviewing requires a full account with a confirmed email'
      });
    }

    try {
      const { id } = req.query;
      const { score, text }: { score: number, text?: string } = req.body;

      const trimmedText = text?.trim();

      if (score === 0 && (!trimmedText || trimmedText.length === 0)) {
        return res.status(400).json({
          error: 'Missing required parameters',
        });
      }

      await dbConnect();

      const levels = await LevelModel.aggregate<Level>([
        {
          $match: {
            _id: new Types.ObjectId(id as string),
            isDeleted: { $ne: true },
            isDraft: false,
          }
        },
        {
          $lookup: {
            from: 'users',
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

      // Check if a review was already created
      const existing = await ReviewModel.findOne({
        userId: req.userId,
        levelId: level._id,
      }, {}, { lean: true });

      if (existing) {
        return res.status(400).json({
          error: 'You already reviewed this level',
        });
      }

      const ts = TimerUtil.getTs();

      const review = await ReviewModel.create({
        _id: new Types.ObjectId(),
        levelId: id,
        score: score,
        text: !trimmedText ? undefined : trimmedText,
        ts: ts,
        userId: req.userId,
      });

      await Promise.all([
        generateDiscordWebhook(undefined, level, req, score, trimmedText, ts),
        queueRefreshIndexCalcs(new Types.ObjectId(id?.toString())),
        createNewReviewOnYourLevelNotification(level.userId._id, req.userId, level._id, String(score)),
      ]);

      return res.status(200).json(review);
    } catch (err) {
      logger.error(err);

      return res.status(500).json({
        error: 'Error creating review',
      });
    }
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const levels = await LevelModel.aggregate<Level>([
      {
        $match: {
          _id: new Types.ObjectId(id as string),
          isDeleted: { $ne: true },
        }
      },
      {
        $lookup: {
          from: 'users',
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
    const { score, text } = req.body;
    const trimmedText = text?.trim();

    if (score === 0 && (!trimmedText || trimmedText.length === 0)) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    const ts = TimerUtil.getTs();

    // NB: setting text to undefined isn't enough to delete it from the db;
    // need to also unset the field to delete it completely
    const update = {
      $set: {
        score: score,
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
        levelId: id,
        userId: req.userId,
      }, update, { runValidators: true });

      if (!review) {
        return res.status(404).json({
          error: 'Error finding Review',
        });
      }

      await Promise.all([
        generateDiscordWebhook(review.ts, level, req, score, trimmedText, ts),
        queueRefreshIndexCalcs(new Types.ObjectId(id?.toString())),
        createNewReviewOnYourLevelNotification(level.userId, req.userId, level._id, String(score)),
      ]);

      return res.status(200).json(review);
    } catch (err) {
      logger.error(err);

      return res.status(500).json({
        error: 'Error updating review',
      });
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    await dbConnect();
    // delete all notifications around this type
    const level = await LevelModel.findById(id);

    if (!level) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    try {
      await ReviewModel.deleteOne({
        levelId: id,
        userId: req.userId,
      });

      await Promise.all([
        queueRefreshIndexCalcs(new Types.ObjectId(id?.toString())),
        clearNotifications(level.userId._id, req.userId, level._id, NotificationType.NEW_REVIEW_ON_YOUR_LEVEL),
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
