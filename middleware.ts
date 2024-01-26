// middleware.ts
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

// RegExp for public files
const PUBLIC_FILE = /\.(.*)$/; // Files
const whiteList = {
  'admin': 1,
  'api': 1,
  'confirm-email': 1,
  'drafts': 1,
  'edit': 1,
  'forgot-password': 1,
  'login': 1,
  'new': 1,
  'notifications': 1,
  'play-as-guest': 1,
  'play-history': 1,
  'profile': 1,
  'ranked': 1,
  'reset-password': 1,
  'settings': 1,
  'signup': 1,
} as Record<string, number>;

const validSubdomain = Object.values(Games).reduce((acc, game) => {
  if (game.subdomain) {
    acc[game.subdomain] = true;
  }

  return acc;
}, {} as Record<string, boolean>) as Record<string, boolean>;

// https://medium.com/@jfbaraky/using-subdomains-as-paths-on-next-js-e5aab5c28c28
export async function middleware(req: NextRequest) {
  // Clone the URL
  const url = req.nextUrl.clone();

  // Skip public files
  if (PUBLIC_FILE.test(url.pathname) || url.pathname.startsWith('/_next')) return;

  const host = req.headers.get('host');
  const subdomain = getValidSubdomain(host);
  const folder = url.pathname.split('/')[1];

  // redirect to sokopath.<host>
  // TODO: remove this after some time...
  if (subdomain === 'sokoban') {
    // NB: need to do this because url.host always returns localhost:3000 (even in prod)
    const hostSuffix = host?.split('.').slice(1).join('.');

    return NextResponse.redirect(`${url.protocol}//sokopath.${hostSuffix}${url.pathname}`);
  }

  if (folder === 'api' || (subdomain !== null && !validSubdomain[subdomain])) {
    return;
  }

  if (folder === 'home') {
    // redirect to /
    url.pathname = '/';

    return NextResponse.redirect(url);
  }

  if (subdomain || whiteList[folder]) {
    url.pathname = `/${subdomain}${url.pathname}`;
  }

  return NextResponse.rewrite(url);
}
