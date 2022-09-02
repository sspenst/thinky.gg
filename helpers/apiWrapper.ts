import { ObjectId } from 'bson';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextApiRequestWithAuth } from '../lib/withAuth';
import { logger } from './logger';

export interface ReqValidator {
  GET?: ReqExpected;
  POST?: ReqExpected,
  PUT?: ReqExpected,
  DELETE?: ReqExpected,
}
export interface ReqExpected {
  body?: { [key: string]: (value: unknown) => boolean };
  query?: { [key: string]: (value: unknown) => boolean };
}

export function ValidType(type: string, mustExist?: boolean) {
  return (value?: unknown) => {
    if ((!mustExist || mustExist === undefined) && !value) {
      return true;
    }

    return typeof value === type;
  };
}

// helpers
export const ValidBlockMongoIDField = {
  id: ValidObjectId(true)

};

export function ValidArray(mustExist?: boolean) {
  return (value?: unknown) => {
    if ((!mustExist || mustExist === undefined) && !value) {
      return true;
    }

    return Array.isArray(value);
  };
}

export function ValidNumber(mustExist?: boolean, min?: number, max?: number) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    if (typeof value !== 'number') {
      return false;
    }

    if (min !== undefined && value < min) {
      return false;
    }

    if (max !== undefined && value > max) {
      return false;
    }

    return true;
  };
}

export function ValidObjectId(mustExist?: boolean) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    return ObjectId.isValid(value as string);
  };
}

export function parseReq(validator: ReqValidator, req: NextApiRequest | NextApiRequestWithAuth): {statusCode: number, error: string} | null {
  const expected = validator[req.method as 'GET' | 'POST' | 'PUT' | 'DELETE'];

  if (!expected) {
    return {
      statusCode: 405,
      error: 'Method not allowed',
    };
  }

  if (expected !== undefined) {
    const badKeys = [];

    if (expected.body !== undefined) {
      for (const [key, validatorFn] of Object.entries(expected.body)) {
        const val = req.body ? req.body[key] : undefined;

        if (!validatorFn(val)) {
          badKeys.push('body.' + key);
        }
      }
    }

    if (expected.query !== undefined) {
      for (const [key, validatorFn] of Object.entries(expected.query)) {
        const val = req.query ? req.query[key] : undefined;

        if (!validatorFn(val)) {
          badKeys.push('query.' + key);
        }
      }
    }

    if (badKeys.length > 0) {
      return {
        statusCode: 400,
        error: 'Invalid ' + badKeys.sort().join(', ')
      };
    }
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
