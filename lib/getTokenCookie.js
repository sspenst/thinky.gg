import cookieOptions from './cookieOptions';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default function getTokenCookie(email) {
  return serialize(
    'token',
    jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    ),
    cookieOptions()
  );
}
