import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie from '../../../lib/getTokenCookie';
import getTs from '../../../helpers/getTs';
import sendPasswordResetEmail from '../../../lib/sendPasswordResetEmail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    const { email, name, password } = req.body;
    const id = new ObjectId();

    await dbConnect();

    const user = await UserModel.findOne<User>({ email: email });

    // if the user exists but there is no ts, send them an email so they sign up with the existing account
    if (user && !user.ts) {
      const sentMessageInfo = await sendPasswordResetEmail(req, user);
      return res.status(200).json({ sentMessage: sentMessageInfo.rejected.length === 0 });
    }

    await UserModel.create({
      _id: id,
      email: email,
      isOfficial: false,
      name: name,
      password: password,
      score: 0,
      ts: getTs(),
    });

    return res.setHeader('Set-Cookie', getTokenCookie(id.toString(), req.headers.host))
      .status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({
      error: 'Error creating user',
    });
  }
}
