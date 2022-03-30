import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export type NextApiRequestWithAuth = NextApiRequest & {
  userId: string;
};

export default function withAuth(handler: (req: NextApiRequestWithAuth, res: NextApiResponse) => Promise<unknown> | void) {
  return async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const token = req.cookies.token;
  
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized: No token provided',
      });
    }
  
    try {
      if (!process.env.JWT_SECRET) {
        throw 'JWT_SECRET not defined';
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (typeof decoded === 'string') {
        throw 'jwt.verify should return JwtPayload';
      }

      req.userId = decoded.userId;

      return handler(req, res);
    } catch(err) {
      res.status(401).json({
        error: 'Unauthorized: Invalid token',
      });
    }
  };
}
