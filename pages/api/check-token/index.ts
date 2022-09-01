import type { NextApiResponse } from 'next';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';

export default withAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  return res.status(200).json({ success: true });
});
