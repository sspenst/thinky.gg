import { serialize } from 'cookie';
import cookieOptions from './cookieOptions';

export default function clearTokenCookie(host: string | undefined, path = '/') {
  return serialize('token', '', cookieOptions(host, true, path));
}
