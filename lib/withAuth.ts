import jwt, { JwtPayload } from 'jsonwebtoken';
import newrelic from 'newrelic';
import type { NextApiRequest, NextApiResponse } from 'next';
import requestIp from 'request-ip';
import { parseReq, ReqValidator } from '../helpers/apiWrapper';
import { TimerUtil } from '../helpers/getTs';
import { logger } from '../helpers/logger';
import User from '../models/db/user';
import { UserModel } from '../models/mongoose';
import dbConnect from './dbConnect';
import getTokenCookie from './getTokenCookie';
import isLocal from './isLocal';

export type NextApiRequestWithAuth = NextApiRequest & {
  user: User;
  userId: string;
};

export async function getUserFromToken(
  token: string | undefined,
  req?: NextApiRequest,
  dontUpdateLastSeen = false,
): Promise<User | null> {
  if (token === undefined) {
    throw new Error('token not defined');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not defined');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
  const userId = decoded.userId as string;

  // track user id attribute for newrelic
  // https://github.com/newrelic/node-newrelic/issues/956#issuecomment-962729137
  if (!isLocal()) {
    newrelic.addCustomAttribute('User Id', userId);
  }

  await dbConnect();

  // Update meta data from user
  const last_visited_ts = TimerUtil.getTs();
  const detectedIp = req ? requestIp.getClientIp(req) : undefined;
  const ipData = !detectedIp ? {} : {
    $addToSet: {
      ip_addresses_used: detectedIp,
    },
  };

  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      // Update last visited only if dontUpdateLastSeen is false
      ...(dontUpdateLastSeen ? {} : {
        $set: {
          last_visited_at: last_visited_ts,
        },
      }),
      ...ipData,
    },
    { lean: true, new: true, projection: '+email +bio' },
  );

  if (user === null) {
    return null;
  }

  return user;
}

export default function withAuth(
  validator: ReqValidator,
  handler: (req: NextApiRequestWithAuth, res: NextApiResponse) => Promise<void>
) {
  return async (
    req: NextApiRequestWithAuth,
    res: NextApiResponse
  ): Promise<void> => {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized: No token provided',
      });
    }

    try {
      const reqUser = await getUserFromToken(token, req);

      if (reqUser === null) {
        return res.status(401).json({
          error: 'Unauthorized: User not found',
        });
      }

      const refreshCookie = getTokenCookie(
        reqUser._id.toString(),
        req.headers?.host
      );

      res.setHeader('Set-Cookie', refreshCookie);
      req.user = reqUser;
      req.userId = reqUser._id.toString();

      const validate = parseReq(validator, req);

      if (validate !== null) {
        return Promise.resolve(
          res.status(validate.statusCode).json({ error: validate.error })
        );
      }

      /* istanbul ignore next */
      return handler(req, res).catch((error: Error) => {
        logger.error('API Handler Error Caught', error);

        return res.status(500).send(error.message || error);
      });
    } catch (err) {
      logger.error(err);

      return res.status(500).json({
        error: 'Unauthorized: Unknown error',
      });
    }
  };
}
