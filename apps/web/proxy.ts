import { NextResponse } from 'next/server';

export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/my-dashboard/:path*',
    '/profile/:path*',
    '/certificates/:path*',
    '/ops/:path*',
  ],
};
