// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const getValidSubdomain = (host?: string | null) => {
  let subdomain: string | null = null;

  if (!host && typeof window !== 'undefined') {
    // On client side, get the host from window
    host = window.location.host;
  }

  if (host && host.includes('.')) {
    const candidate = host.split('.')[0];

    if (candidate && !candidate.includes('localhost')) {
      // Valid candidate
      subdomain = candidate;
    }
  }

  return subdomain;
};

// RegExp for public files
const PUBLIC_FILE = /\.(.*)$/; // Files
const whiteList = {
  'api': 1,
  'forgot-password': 1,
  'login': 1,
  'play-as-guest': 1,
  'profile': 1,
  'reset-password': 1,
  'settings': 1,
  'signup': 1,
  'notifications': 1,

} as Record<string, number>;

export async function middleware(req: NextRequest) {
  // Clone the URL
  const url = req.nextUrl.clone();

  // Skip public files
  if (PUBLIC_FILE.test(url.pathname) || url.pathname.startsWith('/_next')) return;

  const host = req.headers.get('host');
  const subdomain = getValidSubdomain(host);

  const folder = url.pathname.split('/')[1];

  if (folder === 'api') {
    //console.log(`>>> api -> Rewriting folder ${folder}: ${url.pathname} to /api${url.pathname}`);

    return;
  }

  if (subdomain || whiteList[folder]) {
    // console.log(`>>> subdomain -> Rewriting folder ${folder}: ${url.pathname} to /${subdomain}${url.pathname}`);
    url.pathname = `/${subdomain}${url.pathname}`;
  }

  return NextResponse.rewrite(url);
}
