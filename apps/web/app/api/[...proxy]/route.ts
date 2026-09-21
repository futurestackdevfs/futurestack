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
  // The browser never holds the access token (it lives in an HttpOnly cookie).
  // It sends a marker — `Bearer cookie:student` / `Bearer cookie:staff` — and we
  // swap in the matching cookie's JWT, so the portal is explicit and a student
  // cookie can never stand in for a staff request (or vice versa).
  const marker = auth ? /^Bearer\s+cookie:(student|staff)$/i.exec(auth) : null;
  if (marker) {
    const cookie = req.cookies.get(marker[1].toLowerCase() === 'staff' ? 'fs_token_staff' : 'fs_token');
    if (cookie) headers.set('authorization', `Bearer ${cookie.value}`);
  } else if (auth) {
    headers.set('authorization', auth);
  }

  // Forward the real client IP so the backend (behind Render's LB) can record
  // it — Vercel sets x-forwarded-for / x-real-ip to the true client address.
  const fwd = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');
  if (fwd) headers.set('x-forwarded-for', fwd);

  // Forward the HttpOnly cookie token as Authorization if no explicit header
  // Try student token first, fallback to staff token
  if (!auth) {
    // (a marker with a missing cookie stays unauthenticated on purpose)
    const cookie = req.cookies.get('fs_token') ?? req.cookies.get('fs_token_staff');
    if (cookie) headers.set('authorization', `Bearer ${cookie.value}`);
  }

  // Forward cookies so the backend can read refresh token cookies
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) headers.set('cookie', cookieHeader);

  const body = req.method !== 'GET' && req.method !== 'HEAD'
    ? await req.arrayBuffer()
    : undefined;

  const isPublicGet = req.method === 'GET' && path.includes('/public/');

  let backendRes: Response;
  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      body: body ? Buffer.from(body) : undefined,
    };
    
    if (isPublicGet) {
      // Public catalog data changes rarely — let Next's Data Cache hold it for
      // 5 min so most requests never reach the backend.
      fetchOptions.next = { revalidate: 300 };
    } else {
      fetchOptions.cache = 'no-store';
    }

    backendRes = await fetch(url, fetchOptions);
  } catch (err) {
    // Backend unreachable (ECONNREFUSED, timeout, DNS failure, etc.). Log the
    // cause server-side; never return it to the browser — it can carry the
    // internal backend host/port. Connection-refused (API simply not running —
    // common in local dev) is logged as a one-liner; anything else gets the
    // full error for real debugging.
    const code = (err as { cause?: { code?: string }; code?: string })?.cause?.code
      ?? (err as { code?: string })?.code;
    if (code === 'ECONNREFUSED') {
      console.error(`[proxy] ${req.method} ${path} — backend not reachable at ${BACKEND} (is it running?)`);
    } else {
      console.error('[proxy] backend unreachable:', err);
    }
    return NextResponse.json(
      { statusCode: 502, message: 'Service temporarily unavailable. Please try again in a moment.' },
      { status: 502 },
    );
  }

  // Staff portal only: the backend returns a bare `{ "message": "Unauthorized" }`
  // (or "Forbidden resource") on an expired/invalid session, which then surfaces
  // raw in every ops screen. Swap it for an actionable line. Scoped to staff by
  // decoding (not verifying — the token may be expired) the role claim.
  if (backendRes.status === 401 || backendRes.status === 403) {
    const bearer = headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    let role: string | undefined;
    if (bearer) {
      try {
        role = JSON.parse(
          Buffer.from(bearer.split('.')[1] ?? '', 'base64').toString('utf8'),
        ).role;
      } catch { /* not a decodable JWT — leave the response untouched */ }
    }
    const STAFF_ROLES = ['ADMIN', 'TRAINER', 'COORDINATOR', 'CONTENT_MANAGER', 'SUPPORT', 'SALES'];
    if (role && STAFF_ROLES.includes(role)) {
      return NextResponse.json(
        { statusCode: backendRes.status, message: 'Please refresh the browser or retry — you may need to log in again.' },
        { status: backendRes.status },
      );
    }
  }

  // Stream the backend response straight through instead of buffering it all
  // into memory — lower TTFB and memory for large JSON payloads.
  const resBody = backendRes.body;
  const resHeaders = new Headers();
  const resCt = backendRes.headers.get('content-type');
  if (resCt) resHeaders.set('content-type', resCt);
  const resCache = backendRes.headers.get('cache-control');
  if (resCache) {
    resHeaders.set('cache-control', resCache);
  } else if (isPublicGet && backendRes.ok) {
    // Backend didn't set one but this is public catalog data — let the Vercel
    // edge / browser cache it briefly so bursts don't each hit the origin.
    resHeaders.set(
      'cache-control',
      'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    );
  }

  const response = new NextResponse(resBody, {
    status: backendRes.status,
    headers: resHeaders,
  });

  // Forward Set-Cookie using Next.js cookie API (raw header approach doesn't work)
  const setCookie = backendRes.headers.get('set-cookie');
  if (setCookie) {
    const [nv, ...rawAttrs] = setCookie.split(';').map(s => s.trim());
    const eq = nv.indexOf('=');
    if (eq > 0) {
      const name = nv.slice(0, eq);
      const value = nv.slice(eq + 1);
      const opts: Record<string, any> = {};
      for (const a of rawAttrs) {
        const al = a.toLowerCase();
        if (al === 'httponly') opts.httpOnly = true;
        else if (al === 'secure') opts.secure = true;
        else if (al.startsWith('max-age=')) opts.maxAge = parseInt(al.slice(8), 10);
        else if (al.startsWith('path=')) opts.path = al.slice(5);
        else if (al.startsWith('samesite=')) opts.sameSite = al.slice(9);
      }
      response.cookies.set(name, value, opts);
    }
  }

  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
