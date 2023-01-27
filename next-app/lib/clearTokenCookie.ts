import { serialize } from 'cookie';
import cookieOptions from './cookieOptions';

export default function clearTokenCookie(host: string | undefined) {
  return serialize('token', '', cookieOptions(host, true));
}
