import { getOnlyHostname } from '@root/helpers/parseSubdomain';
import { CookieSerializeOptions } from 'cookie';
import isLocal from './isLocal';

// https://github.com/jshttp/cookie#options-1
export default function cookieOptions(host: string | undefined, clear = false): CookieSerializeOptions {
  const topLevelDomain = getOnlyHostname(host || '');

  const domain = topLevelDomain ? `.${topLevelDomain}` : '.thinky.gg';

  return {
    // unfortunately, you can't set a cookie for a subdomain in localhost https://stackoverflow.com/questions/38669040/share-cookies-to-subdomain-on-localhost
    domain: isLocal() ? '' : domain,
    // browsers will delete cookies with a unix epoch expiration date
    expires: clear ? new Date(0) : undefined,
    httpOnly: true,
    // valid for 1 week
    maxAge: clear ? undefined : 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
    secure: !isLocal(),
  };
}
