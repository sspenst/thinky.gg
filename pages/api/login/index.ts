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
  let user = await UserModel.findOne({ name: trimmedName }, '_id password').lean<User>();

  if (!user) {
    user = await UserModel.findOne({ email: trimmedName }, '_id password').lean<User>();
  }

  if (!user || user.password === undefined) {
    return res.status(401).json({
      error: 'Incorrect email or password',
    });
  }

  if (!(await bcrypt.compare(password, user.password))) {
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
