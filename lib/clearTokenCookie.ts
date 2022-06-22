import cookieOptions from './cookieOptions';
import { serialize } from 'cookie';

export default function clearTokenCookie(host: string | undefined, path = '/') {
  return serialize('token', '', cookieOptions(host, true, path));
}
