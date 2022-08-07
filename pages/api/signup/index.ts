import { ObjectId } from 'bson';
import type { NextApiRequest, NextApiResponse } from 'next';
import Theme from '../../../constants/theme';
import getTs from '../../../helpers/getTs';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie from '../../../lib/getTokenCookie';
import sendPasswordResetEmail from '../../../lib/sendPasswordResetEmail';
import User from '../../../models/db/user';
import { UserConfigModel, UserModel } from '../../../models/mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

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

    const trimmedName = name.trim().toLowerCase();

    await dbConnect();

    const user = await UserModel.findOne<User>({ email: email });

    // if the user exists but there is no ts, send them an email so they sign up with the existing account
    if (user && !user.ts) {
      const sentMessageInfo = await sendPasswordResetEmail(req, user);

      return res.status(200).json({ sentMessage: sentMessageInfo.rejected.length === 0 });
    }

    // find where user has name of trimmedName or email of email
    const userWithUsernameOrEmail = await UserModel.findOne<User>({
      $or: [{ name: trimmedName }, { email: email }],
    });

    if (userWithUsernameOrEmail) {
      return res.status(401).json({
        error: 'Username or email already exists',
      });
    }

    const id = new ObjectId();

    await Promise.all([
      UserModel.create({
        _id: id,
        calc_records: 0,
        email: email,
        name: trimmedName,
        password: password,
        score: 0,
        ts: getTs(),
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
    console.trace(err);

    return res.status(500).json({
      error: 'Error creating user',
    });
  }
}
