import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import type { NextApiResponse } from 'next';

export default withAuth((req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  return res.status(200).json({ success: true });
});
