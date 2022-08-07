import jwt from 'jsonwebtoken';
import User from '../models/db/user';

export default function decodeResetPasswordToken(token: string, user: User) {
  const decoded = jwt.verify(token, `${user.ts}-${user.password}`);

  if (typeof decoded === 'string') {
    throw 'jwt.verify should return JwtPayload';
  }

  return decoded.userId;
}
