import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import cookieOptions from './cookieOptions';
import { getValidatedJwtSecret } from './envValidation';

export default function getTokenCookie(userId: string, host: string | undefined) {
  return serialize(
    'token',
    getTokenCookieValue(userId),
    cookieOptions(host),
  );
}

export function getTokenCookieValue(userId: string) {
  // Use validated JWT secret instead of direct environment access
  const jwtSecret = getValidatedJwtSecret();

  return jwt.sign(
    { userId },
    jwtSecret,
    { expiresIn: '7d' }
  );
}
