import type { NextApiRequest, NextApiResponse } from 'next';
import clearTokenCookie from '../../../lib/clearTokenCookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  return res.setHeader('Set-Cookie', clearTokenCookie(req.headers?.host))
    .status(200).json({ success: true });
}
