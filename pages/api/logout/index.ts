import type { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper from '../../../helpers/apiWrapper';
import clearTokenCookie from '../../../lib/clearTokenCookie';

export default apiWrapper({ POST: {} }, async (req: NextApiRequest, res: NextApiResponse) => {
  return res.setHeader('Set-Cookie', clearTokenCookie(req.headers.host))
    .status(200).json({ success: true });
});
