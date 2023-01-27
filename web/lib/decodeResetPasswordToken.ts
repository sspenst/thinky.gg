import jwt, { JwtPayload } from 'jsonwebtoken';
import User from '../models/db/user';

export default function decodeResetPasswordToken(token: string, user: User) {
  const decoded = jwt.verify(token, `${user.ts}-${user.password}`) as JwtPayload;

  return decoded.userId;
}
