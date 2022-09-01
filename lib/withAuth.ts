import jwt, { JwtPayload } from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';
import { apiWrapperAuth } from '../helpers/apiWrapper';
import { enrichReqUser } from '../helpers/enrich';
import { TimerUtil } from '../helpers/getTs';
import { logger } from '../helpers/logger';
import User, { ReqUser } from '../models/db/user';
import { UserModel } from '../models/mongoose';
import dbConnect from './dbConnect';
import getTokenCookie from './getTokenCookie';

export type NextApiRequestWithAuth = NextApiRequest & {
  user: ReqUser;
  userId: string;
};

export async function getUserFromToken(token: string | undefined): Promise<User | null> {
  if (token === undefined) {
    throw new Error('token not defined');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not defined');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
  const userId = decoded.userId;

  // check if user exists
  await dbConnect();
  // Update meta data from user
  const last_visited_ts = TimerUtil.getTs();

  const user = await UserModel.findByIdAndUpdate(userId, {
    $set: {
      'last_visited_at': last_visited_ts,
    }
  }, { lean: true, new: true });

  if (user === null) {
    return null;
  }

  return user;
}

export default function withAuth(handler: (req: NextApiRequestWithAuth, res: NextApiResponse) => Promise<void>) {
  return apiWrapperAuth(async (req: NextApiRequestWithAuth, res: NextApiResponse): Promise<void> => {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized: No token provided',
      });
    }

    try {
      const reqUser = await getUserFromToken(token);

      if (reqUser === null) {
        return res.status(401).json({
          error: 'Unauthorized: User not found',
        });
      }

      const refreshCookie = getTokenCookie(reqUser._id.toString(), req.headers?.host);

      res.setHeader('Set-Cookie', refreshCookie);
      req.user = await enrichReqUser(reqUser);
      req.userId = reqUser._id.toString();

      return handler(req, res);
    } catch (err) {
      logger.error(err);

      return res.status(500).json({
        error: 'Unauthorized: Unknown error',
      });
    }
  });
}
