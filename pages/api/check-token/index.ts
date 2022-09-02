import type { NextApiResponse } from 'next';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';

export default withAuth({ GET: {} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  return res.status(200).json({ success: true });
});
