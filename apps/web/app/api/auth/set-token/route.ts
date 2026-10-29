import { type NextRequest, NextResponse } from 'next/server';
import { isSameOriginJsonRequest, isSameOriginRequest } from '@/lib/same-origin';

// A signed JWT is three base64url segments. Cheap shape check so arbitrary
// strings are never stored as the session cookie.
const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;

// Called after login to set the token as an HttpOnly cookie
// HttpOnly = JS cannot read it → XSS-proof
//
// Same-origin only: Route Handlers get no automatic CSRF protection, and this
// one writes the session cookie, so a cross-site page could otherwise log the
// victim's browser into the attacker's account (see lib/same-origin.ts).
export async function POST(req: NextRequest) {
  if (!isSameOriginJsonRequest({ headers: req.headers, urlHost: req.nextUrl.host })) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== 'string' || token.length > 4096 || !JWT_SHAPE.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('fs_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  if (!isSameOriginRequest({ headers: req.headers, urlHost: req.nextUrl.host })) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('fs_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
