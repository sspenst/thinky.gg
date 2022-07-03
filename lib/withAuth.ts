import type { NextApiRequest, NextApiResponse } from 'next';
import User from '../models/db/user';
import { UserModel } from '../models/mongoose';
import clearTokenCookie from './clearTokenCookie';
import dbConnect from './dbConnect';
import getTokenCookie from './getTokenCookie';
import jwt from 'jsonwebtoken';

export type NextApiRequestWithAuth = NextApiRequest & {
  user: User;
  userId: string;
};

export async function getUserFromToken(token: string | undefined): Promise<User | null> {
  if (token === undefined) {
    throw 'token not defined';
  }

  if (!process.env.JWT_SECRET) {
    throw 'JWT_SECRET not defined';
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (typeof decoded === 'string') {
    throw 'jwt.verify should return JwtPayload';
  }

  const userId = decoded.userId;

  // check if user exists
  await dbConnect();
  const user = await UserModel.findOne<User>({ _id: userId }, {}, { lean: true });

  if (user === null) {
    return null;
  }

  return user;
}

export default function withAuth(handler: (req: NextApiRequestWithAuth, res: NextApiResponse) => Promise<unknown> | void) {
  return async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized: No token provided',
      });
    }

    try {
      const user = await getUserFromToken(token);

      if (user === null) {
        return res.status(401).json({
          error: 'Unauthorized: User not found',
        });
      }

      const cookieLegacy = clearTokenCookie(req.headers?.host, '/api');
      const refreshCookie = getTokenCookie(user._id.toString(), req.headers?.host);

      // @TODO - Remove cookieLegacy after Jun 29th, 2022
      res.setHeader('Set-Cookie', [cookieLegacy, refreshCookie]);
      req.user = user;
      req.userId = user._id.toString();

      return handler(req, res);
    } catch (err) {
      console.trace(err);
      res.status(500).json({
        error: 'Unauthorized: Unknown error',
      });
    }
  };
}
