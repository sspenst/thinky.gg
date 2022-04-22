import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'bson';
import { UserModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie from '../../../lib/getTokenCookie';

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

    await UserModel.create({
      _id: id,
      email: email,
      isCreator: false,
      isOfficial: false,
      name: name,
      password: password,
      score: 0,
      ts: Math.floor(Date.now() / 1000),
    });

    res.setHeader('Set-Cookie', getTokenCookie(id.toString()))
      .status(200).json({ success: true });
  } catch(err) {
    res.status(500).json({
      error: 'Error creating user',
    });
  }
}
