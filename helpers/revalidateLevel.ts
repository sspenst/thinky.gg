import { NextApiResponse } from 'next';
import { NextApiRequestWithAuth } from '../lib/withAuth';

export default async function reevalidateLevel(res: NextApiResponse, slugName: string) {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  try {
    await res.revalidate(`/level/${slugName}`);

    return true;
  } catch (e) {
    console.trace(e);

    return false;
  }
}
