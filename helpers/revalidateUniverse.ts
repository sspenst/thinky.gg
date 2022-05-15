import { NextApiRequestWithAuth } from '../lib/withAuth';
import { NextApiResponse } from 'next';

export default function revalidateUniverse(req: NextApiRequestWithAuth, res: NextApiResponse) {
  return fetch(`${req.headers.origin}/api/revalidate/universe/${req.userId}?secret=${process.env.REVALIDATE_SECRET}`).then(res2 => {
    if (res2.status === 200) {
      return res.status(200).json({ updated: true });
    } else {
      throw res2.text();
    }
  }).catch(err => {
    console.error(err);
    return res.status(500).json({
      error: 'Error revalidating universe',
    });
  });
}
