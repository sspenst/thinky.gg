/* istanbul ignore file */

import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../../helpers/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { statusCode } = req.query;

  logger.info('TESTING INFO LOG');
  logger.warn('TESTING WARN LOG');
  logger.debug('TESTING DEBUG LOG');
  logger.error('TESTING ERROR LOG');
  logger.fatal('TESTING FATAL LOG');
  logger.trace('TESTING TRACE LOG');

  return res.status(parseInt(statusCode as string) || 200).json({ status: 'OK' });
}
