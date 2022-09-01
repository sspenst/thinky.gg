import { NextApiRequest, NextApiResponse } from 'next';
import { NextApiRequestWithAuth } from '../lib/withAuth';
import { logger } from './logger';

// _utils/errors.js
export default function apiWrapper(handler: (req: NextApiRequest | NextApiRequestWithAuth, res: NextApiResponse) => Promise<unknown>) {
  return async (req: NextApiRequest | NextApiRequestWithAuth, res: NextApiResponse) => {
    return handler(req, res).catch((error: Error) => {
      console.log('YO');
      logger.error(error);

      return res.status(500).send(error.message || error);
    });
  };
}
