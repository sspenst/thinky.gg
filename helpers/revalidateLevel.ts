import { NextApiResponse } from 'next';
import { NextApiRequestWithAuth } from '../lib/withAuth';

export default async function reevalidateLevel(res: NextApiResponse, slugName: string) {
  try {
    await res.revalidate(`/level/${slugName}`);

    return true;
  } catch (e) {
    console.trace(e);

    return false;
  }
}
