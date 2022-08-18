import { NextApiResponse } from 'next';
import { logger } from './logger';

export enum RevalidatePaths {
    HOMEPAGE = '/',
    CATALOG_ALL = '/catalog/all',
    STATISTICS = '/statistics',
}

/**
 *
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
    logger.trace(e);

    return false;
  }

  return true;
}
