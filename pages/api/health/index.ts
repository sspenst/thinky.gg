import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../../helpers/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  logger.info('TESTING INFO LOG');
  logger.warn('TESTING WARN LOG');
  logger.debug('TESTING DEBUG LOG');
  logger.error('TESTING ERROR LOG');
  logger.fatal('TESTING FATAL LOG');
  logger.trace('TESTING TRACE LOG');

  return res.status(200).json({ status: 'OK' });
}
