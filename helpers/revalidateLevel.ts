import { NextApiRequestWithAuth } from '../lib/withAuth';

export default async function revalidateLevel(req: NextApiRequestWithAuth, slug: string): Promise<Response> {
  return await fetch(`${req.headers.origin}/api/revalidate/level/${slug}?secret=${process.env.REVALIDATE_SECRET}`);
}
