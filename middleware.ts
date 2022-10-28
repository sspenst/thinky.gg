import { jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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
  matcher: [
    '/',
    '/forgot-password',
    '/login',
    '/reset-password/:path*',
    '/signup',
  ],
};
