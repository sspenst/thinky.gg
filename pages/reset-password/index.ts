import { Types } from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidObjectId, ValidType } from '../../helpers/apiWrapper';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import decodeResetPasswordToken from '../../lib/decodeResetPasswordToken';
import { UserModel } from '../../models/mongoose';

export default apiWrapper({ POST: {
  body: {
    password: ValidType('string'),
    token: ValidType('string'),
    userId: ValidObjectId(),
  }
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  await dbConnect();

  const { password, token, userId } = req.body;
  const user = await UserModel.findById(new Types.ObjectId(userId), '_id ts name password');

  if (!user) {
    return res.status(400).json({
      error: 'Error finding User',
    });
  }

  try {
    if (userId !== decodeResetPasswordToken(token, user)) {
      return res.status(401).json({
        error: 'Malformed token',
      });
    }
  } catch (e) {
    logger.error(e);

    return res.status(401).json({
      error: 'Invalid token',
    });
  }

  user.password = password;

  await user.save();

  return res.status(200).json({ success: true });
});
