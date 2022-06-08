import { NextApiRequestWithAuth } from '../lib/withAuth';
import { NextApiResponse } from 'next';

export default async function revalidateUniverse(
  req: NextApiRequestWithAuth,
  res: NextApiResponse,
  revalidateCatalog = true,
  body = undefined,
) {
  try {
    const revalidateRes = await fetch(`${req.headers.origin}/api/revalidate/universe/${req.userId}?secret=${process.env.REVALIDATE_SECRET}&revalidateCatalog=${revalidateCatalog}`);

    if (revalidateRes.status === 200) {
      return res.status(200).json(body ?? { updated: true });
    } else {
      throw await revalidateRes.text();
    }
  } catch (err) {
    console.trace(err);

    return res.status(500).json({
      error: 'Error revalidating universe ' + err,
    });
  }
}
