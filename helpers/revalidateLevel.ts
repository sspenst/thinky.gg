import { NextApiResponse } from 'next';
import { NextApiRequestWithAuth } from '../lib/withAuth';
import { logger } from './logger';

export default async function reevalidateLevel(res: NextApiResponse, slugName: string) {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  try {
    await res.revalidate(`/level/${slugName}`);

    return true;
  } catch (e) {
    logger.trace(e);

    return false;
  }
}
