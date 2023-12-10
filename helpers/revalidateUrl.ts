/* istanbul ignore file */

import { NextApiResponse } from 'next';
import { logger } from './logger';

/**
 * @param res NextAPI response
 * @param url Url such as `/level/`
 * @returns
 */
export default async function revalidateUrl(res: NextApiResponse, url: string) {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  try {
    await res.revalidate(url);
  } catch (e) {
    logger.error(e);

    return false;
  }

  return true;
}
