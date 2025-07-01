import bcrypt from 'bcryptjs';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../helpers/apiWrapper';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie from '../../../lib/getTokenCookie';
import { captureEvent } from '../../../lib/posthogServer';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';

export default apiWrapper({ POST: {
  body: {
    name: ValidType('string'),
    password: ValidType('string'),
  }
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  await dbConnect();

  const { name, password } = req.body;

  // trim whitespaces from name
  const trimmedName = name.trim();
  
  // Use a single query with $or to find user by name or email
  const user = await UserModel.findOne({
    $or: [
      { name: trimmedName },
      { email: trimmedName }
    ]
  }, '_id password').lean<User>();

  // Always perform bcrypt comparison to prevent timing attacks, even if user doesn't exist
  const hashedPassword = user?.password || '$2b$10$invalidHashToPreventTimingAttack';
  const isValidPassword = await bcrypt.compare(password, hashedPassword);

  if (!user || user.password === undefined || !isValidPassword) {
    return res.status(401).json({
      error: 'Incorrect email or password',
    });
  }

  const cookie = getTokenCookie(user._id.toString(), req.headers.host);

  // Track successful email/password login
  captureEvent(user._id.toString(), 'User Logged In', {
    login_method: 'email',
  });

  return res.setHeader('Set-Cookie', cookie).status(200).json({ success: true });
});
