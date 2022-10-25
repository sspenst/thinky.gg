import bcrypt from 'bcrypt';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../helpers/apiWrapper';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie from '../../../lib/getTokenCookie';
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
  let user = await UserModel.findOne<User>({ name: trimmedName }, '_id password', { lean: true });

  if (!user) {
    user = await UserModel.findOne<User>({ email: trimmedName }, '_id password', { lean: true });
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

  return res.setHeader('Set-Cookie', cookie).status(200).json({ success: true });
});
