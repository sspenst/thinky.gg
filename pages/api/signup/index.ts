import { ObjectId } from 'bson';
import type { NextApiRequest, NextApiResponse } from 'next';
import Theme from '../../../constants/theme';
import apiWrapper from '../../../helpers/apiWrapper';
import { TimerUtil } from '../../../helpers/getTs';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie from '../../../lib/getTokenCookie';
import sendPasswordResetEmail from '../../../lib/sendPasswordResetEmail';
import User from '../../../models/db/user';
import { UserConfigModel, UserModel } from '../../../models/mongoose';

export default apiWrapper({ POST: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        error: 'Error creating user',
      });
    }

    const { email, name, password, tutorialCompletedAt } = req.body;

    if (!email || !name || !password) {
      return res.status(401).json({
        error: 'Missing required fields',
      });
    }

    if (tutorialCompletedAt && typeof tutorialCompletedAt !== 'number') {
      return res.status(401).json({
        error: 'Missing required fields',
      });
    }

    await dbConnect();

    const trimmedEmail = email.trim();
    const userWithEmail = await UserModel.findOne<User>({ email: trimmedEmail }, '+email +password');

    if (userWithEmail) {
      // if the user exists but there is no ts, send them an email so they sign up with the existing account
      if (!userWithEmail.ts) {
        const sentMessageInfo = await sendPasswordResetEmail(req, userWithEmail);

        return res.status(200).json({ sentMessage: sentMessageInfo.rejected.length === 0 });
      } else {
        return res.status(401).json({
          error: 'Email already exists',
        });
      }
    }

    const trimmedName = name.trim();
    const userWithUsername = await UserModel.findOne<User>({ name: trimmedName });

    if (userWithUsername) {
      return res.status(401).json({
        error: 'Username already exists',
      });
    }

    const id = new ObjectId();

    await Promise.all([
      UserModel.create({
        _id: id,
        calc_records: 0,
        email: trimmedEmail,
        name: trimmedName,
        password: password,
        score: 0,
        ts: TimerUtil.getTs(),
      }),
      UserConfigModel.create({
        _id: new ObjectId(),
        sidebar: true,
        theme: Theme.Modern,
        userId: id,
        tutorialCompletedAt: tutorialCompletedAt,
      }),
    ]);

    return res.setHeader('Set-Cookie', getTokenCookie(id.toString(), req.headers?.host))
      .status(200).json({ success: true });
  } catch (err) {
    logger.error(err);

    return res.status(500).json({
      error: 'Error creating user',
    });
  }
});
