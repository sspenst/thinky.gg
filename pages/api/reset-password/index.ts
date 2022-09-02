import { ObjectId } from 'bson';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import dbConnect from '../../../lib/dbConnect';
import decodeResetPasswordToken from '../../../lib/decodeResetPasswordToken';
import { UserModel } from '../../../models/mongoose';

export default apiWrapper({ POST: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  if (!req.body) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  await dbConnect();

  const { password, token, userId } = req.body;

  if (!password || !token || !userId) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  const user = await UserModel.findById(new ObjectId(userId), {}, { lean: false });

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
    return res.status(401).json({
      error: 'Invalid token',
    });
  }

  user.password = password;

  await user.save();

  return res.status(200).json({ success: true });
});
