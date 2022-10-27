// TODO: Dunno why but lint complains about this so have to disable it
/* eslint-disable @next/next/no-server-import-in-page */

import { jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// This function can be marked `async` if using `await` inside
export async function middleware(req: NextRequest) {
  const token = req?.cookies?.get('token');

  if (token && process.env.JWT_SECRET) {
    const secret = process.env.JWT_SECRET;
    const decoded = await jwtVerify(token, new TextEncoder().encode(secret));

    const userId = decoded.payload.userId;

    if (userId) {
      return NextResponse.redirect(new URL('/home', req.url));
    }
  }
}

export const config = {
  matcher: '/', // should hypothetically only match homepage
};
