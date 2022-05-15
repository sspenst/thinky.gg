import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check for secret to confirm this is a valid request
  if (req.query.secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { levelId, universeId, worldId } = req.body;

  try {
    await Promise.all([
      res.unstable_revalidate(`/catalog`),
      res.unstable_revalidate(`/level/${levelId}`),
      res.unstable_revalidate(`/universe/${universeId}`),
      res.unstable_revalidate(`/world/${worldId}`),
    ]);

    return res.status(200).json({ revalidated: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // If there was an error, Next.js will continue
    // to show the last successfully generated page
    return res.status(500).send({ message: err.message, stack: err.stack });
  }
}
