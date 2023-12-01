import { requestKillSocket } from '@root/lib/appSocketToClient';
import { getUserFromToken } from '@root/lib/withAuth';
import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import clearTokenCookie from '../../../lib/clearTokenCookie';

export default apiWrapper({ POST: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  // if they are logged in, kill the socket connection
  const token = req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, req) : null;

  if (reqUser) {
    await requestKillSocket(reqUser._id);
  }

  return res.setHeader('Set-Cookie', clearTokenCookie(req.headers.host))
    .status(200).json({ success: true });
});
