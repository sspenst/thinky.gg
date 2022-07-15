import { LevelModel, ReviewModel } from '../../../models/mongoose';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import Discord from '../../../constants/discord';
import type { NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import dbConnect from '../../../lib/dbConnect';
import discordWebhook from '../../../helpers/discordWebhook';
import getTs from '../../../helpers/getTs';

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

      if (!id || !score) {
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
      });

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
        text: !text ? undefined : text,
        ts: ts,
        userId: req.userId,
      });

      if (text) {
        const stars = '⭐'.repeat(parseInt(score));
        let slicedText = text.slice(0, 100);

        if (slicedText.length < text.length) {
          slicedText = slicedText.concat('...');
        }

        const discordTxt = `${parseInt(score) > 0 ? stars + ' - ' : ''}**${req.user?.name}** wrote a review for ${level.userId.name}'s [${level.name}](${req.headers.origin}/level/${level.slug}?ts=${ts}):\n${slicedText}`;

        await discordWebhook(Discord.NotifsId, discordTxt);
      }

      return res.status(200).json(review);
    } catch (err) {
      return res.status(500).json({
        error: 'Error creating review',
      });
    }
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const { score, text } = req.body;

    // NB: setting text to undefined isn't enough to delete it from the db;
    // need to also unset the field to delete it completely
    const update = {
      $set: {
        score: score,
        text: !text ? undefined : text,
        ts: getTs(),
      },
      $unset: {},
    };

    if (!text) {
      update.$unset = {
        text: '',
      };
    }

    try {
      const review = await ReviewModel.updateOne({
        levelId: id,
        userId: req.userId,
      }, update);

      return res.status(200).json(review);
    } catch (err){
      return res.status(500).json({
        error: 'Error updating review',
      });
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    await dbConnect();

    try {
      await ReviewModel.deleteOne({
        levelId: id,
        userId: req.userId,
      });

      return res.status(200).json({ success: true });
    } catch (err){
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
