import { CookieSerializeOptions } from 'cookie';
import isLocal from './isLocal';

// https://github.com/jshttp/cookie#options-1
export default function cookieOptions(host: string | undefined, clear = false): CookieSerializeOptions {
  return {
    domain: isLocal() ? '' : host ?? 'pathology.k2xl.com',
    // browsers will delete cookies with a unix epoch expiration date
    expires: clear ? new Date(0) : undefined,
    httpOnly: true,
    // valid for 1 week
    maxAge: clear ? undefined : 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'strict',
    secure: !isLocal(),
  };
}
