import { type NextRequest, NextResponse } from 'next/server';

// Google (OAuth) student login: the backend issues the refresh token on its own
// domain, which the browser never sends to this site's /api/auth/refresh. The
// OAuth callback page hands it here once so it can live as an HttpOnly cookie
// on THIS domain (named exactly what the backend's refresh endpoint reads).
export async function POST(req: NextRequest) {
  const { refresh } = await req.json().catch(() => ({}));
  if (!refresh || typeof refresh !== 'string' || refresh.length > 512) {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('fs_student_refresh', refresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // seconds — matches the backend's 7-day refresh expiry
  });
  return res;
}
