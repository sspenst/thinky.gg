import cookieOptions from './cookieOptions';
import { serialize } from 'cookie';

export default function clearTokenCookie() {
  return serialize('token', '', cookieOptions(true));
}
