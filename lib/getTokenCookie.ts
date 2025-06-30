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

export function getTokenCookieForDiscordEmbed(userId: string, host: string | undefined) {
  const token = getTokenCookieValue(userId);

  // For Discord embeds, we might need more permissive cookie settings
  const options = {
    ...cookieOptions(host),
    domain: undefined,
    path: '/',
    sameSite: 'none' as const,
    httpOnly: true,
    secure: true,
    maxAge: 60, // For discord, we need to shorten the max age to 1 minute
  };

  return serialize('token', token, options);
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
