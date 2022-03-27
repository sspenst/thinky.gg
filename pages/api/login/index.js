import { UserModel } from '../../../models/mongoose';
import bcrypt from 'bcrypt';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie from '../../../lib/getTokenCookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  await dbConnect();

  const { name, password } = req.body;
  const user = await UserModel.findOne({ name });

  if (!user) {
    return res.status(401).json({
      error: 'Incorrect email or password',
    });
  }

  if (!await bcrypt.compare(password, user.password)) {
    return res.status(401).json({
      error: 'Incorrect email or password',
    });
  }

  res.setHeader('Set-Cookie', getTokenCookie(user._id))
    .status(200).json({ success: true });
}
