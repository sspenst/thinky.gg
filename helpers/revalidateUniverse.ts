import { NextApiRequestWithAuth } from '../lib/withAuth';
import { NextApiResponse } from 'next';

export default async function revalidateUniverse(
  req: NextApiRequestWithAuth,
  res: NextApiResponse,
  revalidateCatalog = true,
) {
  try {
    const revalidateRes = await fetch(`${req.headers.origin}/api/revalidate/universe/${req.userId}?secret=${process.env.REVALIDATE_SECRET}&revalidateCatalog=${revalidateCatalog}`);

    if (revalidateRes.status === 200) {
      return res.status(200).json({ updated: true });
    } else {
      throw revalidateRes.text();
    }
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: 'Error revalidating universe ' + err,
    });
  }
}
