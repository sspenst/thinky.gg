import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import sendPasswordResetEmail from '../../../lib/sendPasswordResetEmail';
import User from '../../../models/db/user';
import { UserModel } from '../../../models/mongoose';

export default apiWrapper({ POST: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  await dbConnect();

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  const user = await UserModel.findOne<User>({ email });

  if (!user) {
    return res.status(404).json({
      error: 'Could not find an account with this email',
    });
  }

  try {
    const sentMessageInfo = await sendPasswordResetEmail(req, user);

    if (!sentMessageInfo) {
      logger.error('Error sending password reset email for ' + user.email);

      return res.status(500).json({
        error: 'Could not send password reset email',
      });
    }

    return res.status(200).json({ success: sentMessageInfo.rejected.length === 0 });
  } catch (e) {
    logger.error(e);

    return res.status(500).json({
      error: 'Could not send password reset email',
    });
  }
});
