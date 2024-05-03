import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import sendPasswordResetEmail from '../../../lib/sendPasswordResetEmail';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';

export default apiWrapper({ POST: {
  body: {
    email: ValidType('string'),
  }
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  await dbConnect();

  const { email } = req.body;
  const user = await UserModel.findOne<User>({ email }, '+email +password');

  if (!user) {
    return res.status(404).json({
      error: 'Could not find an account with this email',
    });
  }

  try {
    const error = await sendPasswordResetEmail(req, user);

    if (error) {
      logger.error('Error sending password reset email for ' + user.email);

      return res.status(error.status).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    logger.error(e);

    return res.status(500).json({
      error: 'Could not send password reset email',
    });
  }
});
