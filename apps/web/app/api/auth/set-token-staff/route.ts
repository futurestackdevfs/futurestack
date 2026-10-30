import { type NextRequest, NextResponse } from 'next/server';
import { isSameOriginJsonRequest, isSameOriginRequest } from '@/lib/same-origin';

const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;

// Same-origin only - see app/api/auth/set-token/route.ts and lib/same-origin.ts.
export async function POST(req: NextRequest) {
  if (!isSameOriginJsonRequest({ headers: req.headers, urlHost: req.nextUrl.host })) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== 'string' || token.length > 4096 || !JWT_SHAPE.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('fs_token_staff', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  if (!isSameOriginRequest({ headers: req.headers, urlHost: req.nextUrl.host })) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('fs_token_staff', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
