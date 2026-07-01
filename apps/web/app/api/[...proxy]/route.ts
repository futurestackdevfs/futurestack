import { type NextRequest, NextResponse } from 'next/server';

// Server-only — never exposed to the browser bundle
const BACKEND = process.env.API_URL ?? 'http://localhost:3002';

async function proxy(req: NextRequest) {
  // Strip the /api prefix to get the real backend path
  const path = req.nextUrl.pathname.replace(/^\/api/, '');
  const search = req.nextUrl.search;
  const url = `${BACKEND}${path}${search}`;

  const headers = new Headers();
  // Forward content-type and auth header if present
  const ct = req.headers.get('content-type');
  if (ct) headers.set('content-type', ct);
  const auth = req.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  // Forward the HttpOnly cookie token as Authorization if no explicit header
  if (!auth) {
    const cookie = req.cookies.get('fs_token');
    if (cookie) headers.set('authorization', `Bearer ${cookie.value}`);
  }

  const body = req.method !== 'GET' && req.method !== 'HEAD'
    ? await req.arrayBuffer()
    : undefined;

  let backendRes: Response;
  try {
    backendRes = await fetch(url, {
      method: req.method,
      headers,
      body: body ? Buffer.from(body) : undefined,
      cache: 'no-store',
    });
  } catch (err) {
    // Backend unreachable (ECONNREFUSED, timeout, DNS failure, etc.)
    return NextResponse.json(
      { statusCode: 502, message: 'Backend unreachable', error: String(err) },
      { status: 502 },
    );
  }

  const resBody = await backendRes.arrayBuffer();
  const resHeaders = new Headers();
  const resCt = backendRes.headers.get('content-type');
  if (resCt) resHeaders.set('content-type', resCt);

  return new NextResponse(resBody, {
    status: backendRes.status,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
