import UserConfig from '@root/models/db/userConfig';
import jwt, { JwtPayload } from 'jsonwebtoken';
// https://github.com/newrelic/node-newrelic/issues/956#issuecomment-962729137
import type { NextApiRequest, NextApiResponse } from 'next';
import requestIp from 'request-ip';
import { GameId } from '../constants/GameId';
import { parseReq, ReqValidator } from '../helpers/apiWrapper';
import { getGameIdFromReq } from '../helpers/getGameIdFromReq';
import { TimerUtil } from '../helpers/getTs';
import { logger } from '../helpers/logger';
import User from '../models/db/user';
import { UserConfigModel, UserModel } from '../models/mongoose';
import dbConnect from './dbConnect';
import getTokenCookie from './getTokenCookie';
import isLocal from './isLocal';

export type NextApiRequestWithAuth = NextApiRequest & {
  gameId: GameId;
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

  let verifiedSignature: JwtPayload | undefined;

  try {
    verifiedSignature = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
  } catch (err) {
    logger.error(err);

    return null;
  }

  const decoded = verifiedSignature;
  const userId = decoded.userId as string;
  // dynamically import newrelic
  const newrelic = await import('newrelic');

  if (!isLocal()) {
    newrelic.addCustomAttribute && newrelic.addCustomAttribute('userId', userId);
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

  const gameId = getGameIdFromReq(req);
  const [user, config] = await Promise.all([UserModel.findByIdAndUpdate(
    userId,
    {
      // Update last visited only if dontUpdateLastSeen is false
      ...(dontUpdateLastSeen ? {} : {
        $set: {
          last_visited_at: last_visited_ts,
          lastGame: gameId
        },
      }),
      ...ipData,
    },
    { new: true, projection: '+email +bio +emailConfirmed' },
  ).lean<User>(),
  UserConfigModel.findOne({ userId: userId }, { calcRankedSolves: 1, calcLevelsCreatedCount: 1, calcLevelsSolveCount: 1, chapterUnlocked: 1 }).lean<UserConfig>()
  ]);

  if (user && !isLocal()) {
    newrelic.addCustomAttribute && newrelic.addCustomAttribute('userName', user.name);
  }

  if (user && config) {
    user.config = config as UserConfig;
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

      req.gameId = getGameIdFromReq(req);
      req.user = reqUser;
      req.userId = reqUser._id.toString();

      const validate = parseReq(validator, req);

      if (validate !== null) {
        return Promise.resolve(
          res.status(validate.statusCode).json({
            error: validate.error,
          })
        );
      }

      /* istanbul ignore next */
      return handler(req, res).catch((error: Error) => {
        logger.error('API Handler Error Caught', error);

        return res.status(500).json({
          error: error.message || error,
        });
      });
    } catch (err) {
      logger.error(err);

      return res.status(500).json({
        error: 'Unauthorized: Unknown error',
      });
    }
  };
}
