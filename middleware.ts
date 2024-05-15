import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Games } from './constants/Games';
import { parseSubdomain } from './helpers/parseUrl';

export const getValidSubdomain = (host?: string | null) => {
  let subdomain: string | null = null;

  if (!host && typeof window !== 'undefined') {
    // On client side, get the host from window
    host = window.location.host;
  }

  const hostSplit = host?.split('.');

  if (host && hostSplit) {
    const candidate = parseSubdomain(host);

    if (candidate) {
      // Valid candidate
      subdomain = candidate;
    }
  }

  return subdomain;
};

// regex for public files
const PUBLIC_FILE = /\.(.*)$/;

// pages that are allowed to be accessed without a subdomain (GameId.THINKY)
const noSubdomainPages = new Set([
  'achievement',
  'admin',
  'api',
  'confirm-email',
  'forgot-password',
  'login',
  'notifications',
  'play-as-guest',
  'profile',
  'reset-password',
  'settings',
  'signup',
]);

const validSubdomains = new Set<string>();

for (const game of Object.values(Games)) {
  if (game.subdomain) {
    validSubdomains.add(game.subdomain);
  }
}

// https://medium.com/@jfbaraky/using-subdomains-as-paths-on-next-js-e5aab5c28c28
export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // skip public files
  if (PUBLIC_FILE.test(url.pathname) || url.pathname.startsWith('/_next')) {
    return;
  }

  const host = req.headers.get('host');
  const subdomain = getValidSubdomain(host);
  const folder = url.pathname.split('/')[1];

  // don't redirect api calls or invalid subdomains
  if (folder === 'api' || (subdomain !== null && !validSubdomains.has(subdomain))) {
    return;
  }

  // redirect urls like thinky.gg/pathology/play to pathology.thinky.gg/play
  if (!subdomain && validSubdomains.has(folder)) {
    const path = url.pathname.split('/').slice(2).join('/');

    return NextResponse.redirect(`${url.protocol}//${folder}.${host}/${path}`);
  }

  if (subdomain || noSubdomainPages.has(folder)) {
    // NB: this actually updates thinky.gg/pathname pages to thinky.gg/null/pathname, so they are able to access the [subdomain] route
    url.pathname = `/${subdomain}${url.pathname}`;
  }

  return NextResponse.rewrite(url);
}
