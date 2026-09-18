import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.API_URL ?? 'http://localhost:3002';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const backendRes = await fetch(`${BACKEND}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!backendRes.ok) {
    return NextResponse.redirect(new URL('/?error=session_expired', req.url));
  }

  const refresh = req.nextUrl.searchParams.get('refresh');

  const redirectUrl = new URL('/auth/oauth/callback', req.url);
  redirectUrl.searchParams.set('token', token);
  if (refresh) redirectUrl.searchParams.set('refresh', refresh);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set('fs_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  if (refresh) {
    response.cookies.set('fs_student_refresh', refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  return response;
}
