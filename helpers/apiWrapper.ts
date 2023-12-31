import { GameId } from '@root/constants/GameId';
import { isValidDirections } from '@root/helpers/checkpointHelpers';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextApiRequestWithAuth } from '../lib/withAuth';
import { logger } from './logger';

export interface NextApiRequestWrapper extends NextApiRequest {
  gameId: GameId;
}

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

/**
 *
 * @param type Type you want to check
 * @param mustExist Whether this value must exist
 * @param parsedString Whether to parse the string before checking type (i.e. from query params)
 * @returns
 */
export function ValidType(type: string, mustExist = true, parsedString = false) {
  return (value?: unknown) => {
    if (mustExist && value === undefined) {
      return false;
    }

    if (parsedString && value !== undefined) {
      let parsedType = 'string';

      try {
        parsedType = typeof JSON.parse(value as string);
      } catch (e) {
        // do nothing
      }

      return typeof value === 'string' && parsedType === type;
    } else if (value !== undefined) {
      return typeof value === type;
    } else {
      return true;
    }
  };
}

export function ValidDate(mustExist = true) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    return !isNaN(new Date(value as string).getTime());
  };
}

export function ValidEnum(values: string[], mustExist = true) {
  return (value?: unknown) => {
    if (!value) {
      return !mustExist;
    }

    return values.includes(value as string);
  };
}

export function ValidArray(mustExist = true) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    return Array.isArray(value);
  };
}

export function ValidDirections() {
  return (value?: unknown) => {
    return isValidDirections(value);
  };
}

export function ValidNumber(mustExist = true, min?: number, max?: number, incrementAllowed?: number) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    const v = Number(value);

    if (isNaN(v)) {
      return false;
    }

    if (min !== undefined && v < min) {
      return false;
    }

    if (max !== undefined && v > max) {
      return false;
    }

    if (incrementAllowed !== undefined && v % incrementAllowed !== 0) {
      return false;
    }

    return true;
  };
}

export function ValidObjectId(mustExist = true) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    return Types.ObjectId.isValid(value as string);
  };
}

export function ValidCommaSeparated(mustExist = true, validateEachElement?: (value: string) => boolean) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    if (typeof value !== 'string') {
      return false;
    }

    const values = value.split(',');

    if (validateEachElement) {
      return values.every(validateEachElement);
    }

    return true;
  };
}

export function ValidObjectIdArray(mustExist = true) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    return Array.isArray(value) && value.every(v => Types.ObjectId.isValid(v as string));
  };
}

export function ValidObjectIdPNG(mustExist = true) {
  return (value?: unknown) => {
    if (!mustExist && !value) {
      return true;
    }

    // strip .png from id
    return Types.ObjectId.isValid((value as string)?.replace(/\.png$/, ''));
  };
}

export function parseReq(validator: ReqValidator, req: NextApiRequest | NextApiRequestWithAuth): {statusCode: number, error: string} | null {
  const expected = validator[req.method as 'GET' | 'POST' | 'PUT' | 'DELETE'];

  if (!expected) {
    logger.error(`Invalid method ${req.method} for url ${req.url}`);

    return {
      statusCode: 405,
      error: 'Method not allowed',
    };
  }

  const badKeys = [];

  if (expected.body !== undefined) {
    if (!req.body) {
      return {
        statusCode: 400,
        error: 'Bad request',
      };
    }

    for (const [key, validatorFn] of Object.entries(expected.body)) {
      const val = req.body[key];

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

  return null;
}

export default function apiWrapper(
  validator: ReqValidator,
  handler: (req: NextApiRequestWrapper, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequestWrapper, res: NextApiResponse): Promise<unknown> => {
    const validate = parseReq(validator, req);

    if (validate !== null) {
      logger.error('API Handler Error', validate);

      return Promise.resolve(res.status(validate.statusCode).json({ error: validate.error }));
    }

    req.gameId = getGameIdFromReq(req);

    /* istanbul ignore next */
    return handler(req, res).catch((error: Error) => {
      logger.error('API Handler Error Caught', error);
      console.trace();

      return res.status(500).send(error.message || error);
    });
  };
}
