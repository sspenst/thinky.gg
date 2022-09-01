import { NextApiRequest, NextApiResponse } from 'next';
import { NextApiRequestWithAuth } from '../lib/withAuth';
import { logger } from './logger';

export interface ReqValidator {
  methods?: string[];
}

export function parseReq(validator: ReqValidator, req: NextApiRequest | NextApiRequestWithAuth): {statusCode: number, error: string} | null {
  if (!req.method || validator.methods !== undefined && validator.methods.length > 0 && !validator.methods.includes(req.method)) {
    return {
      statusCode: 405,
      error: 'Method not allowed',
    };
  }

  return null;
}

export default function apiWrapper(validator: ReqValidator, handler: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<unknown> => {
    const validate = parseReq(validator, req);

    if (validate !== null) {
      return Promise.resolve(res.status(validate.statusCode).json({ error: validate.error }));
    }

    return handler(req, res).catch((error: Error) => {
      logger.error('API Handler Error Caught', error);

      return res.status(500).send(error.message || error);
    });
  };
}
