import UserModel from '../../../models/mongoose/userModel';
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

  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });

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

  res.setHeader('Set-Cookie', getTokenCookie(email))
    .status(200).json({ success: true });
}
