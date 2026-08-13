import { type NextRequest, NextResponse } from 'next/server';

// Guards the ops (staff) area. The backend keeps the real authorization on
// every API call — this proxy is only the coarse SPA-layer gate so an
// unauthenticated visitor is sent to staff login instead of seeing the admin
// UI shell. The staff JWT is mirrored into the HttpOnly `fs_token_staff`
// cookie (7-day) by /api/auth/set-token-staff after login / refresh, which is
// what we check here.
export function proxy(request: NextRequest) {
  const hasStaffSession = request.cookies.has('fs_token_staff');
  if (hasStaffSession) return NextResponse.next();

  const loginUrl = new URL('/auth/staff-login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: '/ops/:path*',
};
