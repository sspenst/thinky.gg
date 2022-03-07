import UserModel from '../../../models/mongoose/userModel';
import bcrypt from 'bcrypt';
import cookieOptions from '../../../helpers/cookieOptions';
import dbConnect from '../../../lib/dbConnect';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'POST') {
    res.status(400).json({ error: 'Invalid method type' });
    return;
  }

  await dbConnect();

  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });

  if (!user) {
    res.status(401).json({ error: 'Incorrect email or password' });
    return;
  }

  const isCorrectPassword = await bcrypt.compare(password, user.password);

  if (!isCorrectPassword) {
    res.status(401).json({ error: 'Incorrect email or password' });
    return;
  }

  const token = jwt.sign({ email }, process.env.SECRET, {
    expiresIn: '1d'
  });

  res.setHeader('Set-Cookie', serialize('token', token, cookieOptions()))
    .status(200).json({ success: true });
}
