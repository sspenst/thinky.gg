import { ObjectId } from 'bson';
import type { NextApiResponse } from 'next';
import { NotificationType } from '../../../components/notification/notificationList';
import Discord from '../../../constants/discord';
import { clearNotifications, createNewReviewOnYourLevelNotification } from '../../../helpers/createNotifications';
import discordWebhook from '../../../helpers/discordWebhook';
import getTs from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import revalidateUrl, { RevalidatePaths } from '../../../helpers/revalidateUrl';
import dbConnect from '../../../lib/dbConnect';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { LevelModel, NotificationModel, ReviewModel } from '../../../models/mongoose';
import { refreshIndexCalcs } from '../../../models/schemas/levelSchema';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      if (!req.query || !req.body) {
        return res.status(400).json({
          error: 'Missing required parameters',
        });
      }

      const { id } = req.query;
      const { score, text } = req.body;

      if (!id) {
        return res.status(400).json({
          error: 'Missing required parameters',
        });
      }

      // check if score is not an integer
      if (isNaN(Number(score))) {
        return res.status(400).json({
          error: 'Missing required parameters',
        });
      }

      if (score < 0 || score > 5) {
        return res.status(400).json({
          error: 'Score must be between 0 and 5',
        });
      }

      const trimmedText = text?.trim();

      if (score === 0 && (!trimmedText || trimmedText.length === 0)) {
        return res.status(400).json({
          error: 'Missing required parameters',
        });
      }

      await dbConnect();

      // validate level is legit
      const level = await LevelModel.findOne({ _id: id, isDraft: false }).populate('userId');

      if (!level) {
        return res.status(404).json({
          error: 'Level not found',
        });
      }

      // Check if a review was already created
      const existing = await ReviewModel.findOne({
        userId: req.userId,
        levelId: level.id,
      }, {}, { lean: true });

      if (existing) {
        return res.status(400).json({
          error: 'You already reviewed this level',
        });
      }

      const ts = getTs();
      const review = await ReviewModel.create({
        _id: new ObjectId(),
        levelId: id,
        score: score,
        text: !trimmedText ? undefined : trimmedText,
        ts: ts,
        userId: req.userId,
      });

      await refreshIndexCalcs(new ObjectId(id?.toString()));
      const stars = '⭐'.repeat(parseInt(score));

      if (trimmedText) {
        const stars = '⭐'.repeat(parseInt(score));
        let slicedText = text.slice(0, 300);

        if (slicedText.length < text.length) {
          slicedText = slicedText.concat('...');
        }

        const discordTxt = `${parseInt(score) > 0 ? stars + ' - ' : ''}**${req.user?.name}** wrote a review for ${level.userId.name}'s [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts}):\n${slicedText}`;

        const [revalidateHomeRes] = await Promise.all([
          revalidateUrl(res, RevalidatePaths.HOMEPAGE),
          discordWebhook(Discord.NotifsId, discordTxt),
        ]);

        if (!revalidateHomeRes) {
          throw 'Error revalidating home';
        }
      }

      // create notification for this type if it exists
      // delete all notifications around this type
      await clearNotifications(level.userId._id, req.userId, level._id, NotificationType.NEW_REVIEW_ON_YOUR_LEVEL);
      await createNewReviewOnYourLevelNotification(level.userId._id, req.userId, level._id, stars);

      return res.status(200).json(review);
    } catch (err) {
      logger.error(err);

      return res.status(500).json({
        error: 'Error creating review',
      });
    }
  } else if (req.method === 'PUT') {
    const { id } = req.query;

    // check if id is bson
    if (id && !ObjectId.isValid(id.toString())) {
      return res.status(400).json({
        error: 'Invalid level id',
      });
    }

    const level = await LevelModel.findById(id);

    if (!level) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    const { score, text } = req.body;

    // check if score is not an integer
    if (isNaN(Number(score))) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    if (score < 0 || score > 5) {
      return res.status(400).json({
        error: 'Score must be between 0 and 5',
      });
    }

    const trimmedText = text?.trim();

    if (score === 0 && (!trimmedText || trimmedText.length === 0)) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }

    // NB: setting text to undefined isn't enough to delete it from the db;
    // need to also unset the field to delete it completely
    const update = {
      $set: {
        score: score,
        text: !trimmedText ? undefined : trimmedText,
        ts: getTs(),
      },
      $unset: {},
    };

    if (!trimmedText) {
      update.$unset = {
        text: '',
      };
    }

    try {
      const review = await ReviewModel.updateOne({
        levelId: id,
        userId: req.userId,
      }, update, { runValidators: true });

      const [revalidateHomeRes] = await Promise.all([
        revalidateUrl(res, RevalidatePaths.HOMEPAGE),
        refreshIndexCalcs(new ObjectId(id?.toString())),
      ]);

      if (!revalidateHomeRes) {
        throw 'Error revalidating home';
      }

      const stars = '⭐'.repeat(parseInt(score));

      await createNewReviewOnYourLevelNotification(level.userId, req.userId, level._id, stars);

      return res.status(200).json(review);
    } catch (err){
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

      const [revalidateHomeRes] = await Promise.all([
        revalidateUrl(res, RevalidatePaths.HOMEPAGE),
        refreshIndexCalcs(new ObjectId(id?.toString())),
      ]);

      if (!revalidateHomeRes) {
        throw 'Error revalidating home';
      }

      await clearNotifications(level.userId._id, req.userId, level._id, NotificationType.NEW_REVIEW_ON_YOUR_LEVEL);

      return res.status(200).json({ success: true });
    } catch (err){
      logger.error(err);

      return res.status(500).json({
        error: 'Error deleting review',
      });
    }
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }
});
