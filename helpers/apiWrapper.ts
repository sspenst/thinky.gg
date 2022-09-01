import { NextApiRequest, NextApiResponse } from 'next';
import { NextApiRequestWithAuth } from '../lib/withAuth';
import { logger } from './logger';

// _utils/errors.js
export default function apiWrapper(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<unknown> => {
    return handler(req, res).catch((error: Error) => {
      logger.error(error.message, error);

      return res.status(500).send(error.message || error);
    });
  };
}

export function apiWrapperAuth(handler: (req: NextApiRequestWithAuth, res: NextApiResponse) => Promise<unknown>) {
  return async (req: NextApiRequestWithAuth, res: NextApiResponse): Promise<unknown> => {
    return handler(req, res).catch((error: Error) => {
      logger.error(error.message, error);

      return res.status(500).send(error.message || error);
    });
  };
}
