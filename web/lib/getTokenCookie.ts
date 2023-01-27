import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import cookieOptions from './cookieOptions';

export default function getTokenCookie(userId: string, host: string | undefined) {
  return serialize(
    'token',
    getTokenCookieValue(userId),
    cookieOptions(host),
  );
}

export function getTokenCookieValue(userId: string) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not defined');
  }

  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
