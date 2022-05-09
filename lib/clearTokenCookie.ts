import cookieOptions from './cookieOptions';
import { serialize } from 'cookie';

export default function clearTokenCookie(host: string | undefined) {
  return serialize('token', '', cookieOptions(host, true));
}
