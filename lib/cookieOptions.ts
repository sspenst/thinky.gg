import { CookieSerializeOptions } from 'cookie';

// https://github.com/jshttp/cookie#options-1
export default function cookieOptions(host: string | undefined, clear = false): CookieSerializeOptions {
  return {
    domain: parseHost(host),
    // browsers will delete cookies with a unix epoch expiration date
    expires: clear ? new Date(0) : undefined,
    httpOnly: true,
    // valid for 1 week
    maxAge: clear ? undefined : 60 * 60 * 24 * 7,
    path: '/api',
    sameSite: 'strict',
    secure: !process.env.LOCAL,
  };
}

export function parseHost(host:string | undefined):string {
  return (process.env.LOCAL?.toString() === 'true') ? 'localhost' : host ?? 'pathology.k2xl.com';
}
