import cookieOptions from './cookieOptions';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default function getTokenCookie(userId: string, host: string | undefined) {
  if (!process.env.JWT_SECRET) {
    throw 'JWT_SECRET not defined';
  }

  return serialize(
    'token',
    jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    ),
    cookieOptions(host),
  );
}
