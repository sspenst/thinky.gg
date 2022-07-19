import { NextApiRequestWithAuth } from '../lib/withAuth';

export default async function revalidateUniverse(
  req: NextApiRequestWithAuth,
  revalidateCatalog = true,
): Promise<Response> {
  return await fetch(`${req.headers.origin}/api/revalidate/universe/${req.userId}?secret=${process.env.REVALIDATE_SECRET}&revalidateCatalog=${revalidateCatalog}`);
}
