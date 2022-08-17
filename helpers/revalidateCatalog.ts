import { NextApiResponse } from 'next';
import { logger } from './logger';

export default async function revalidateCatalog(res: NextApiResponse) {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  try {
    await res.revalidate('/catalog/all');
  } catch (e) {
    logger.trace(e);

    return false;
  }

  return true;
}
