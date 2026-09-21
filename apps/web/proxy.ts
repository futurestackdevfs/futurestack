import { type NextRequest, NextResponse } from 'next/server';

/**
 * Two jobs:
 *
 * 1. Per-request Content-Security-Policy with a nonce (all pages). Every
 *    response gets a fresh random nonce; only <script> tags carrying it run,
 *    so an injected inline script is blocked even if markup injection
 *    succeeds. `strict-dynamic` lets a trusted (nonce'd) script pull in more
 *    scripts — that's how the Razorpay Checkout and VdoCipher player scripts,
 *    appended at runtime by the app's own bundle, keep working. `https:` is a
 *    fallback for browsers without `strict-dynamic`. `style-src` still allows
 *    'unsafe-inline' (styled-jsx / Tailwind) — style injection is low risk.
 *
 * 2. Coarse SPA gate for the ops (staff) area — the backend still enforces
 *    real authorization on every API call; this only sends an unauthenticated
 *    visitor to staff login instead of the admin UI shell.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https://*.vdocipher.com",
    // The admin video-upload flow gets a signed URL from VdoCipher's API but
    // the actual file PUT/POST goes straight to S3 (accelerate endpoint) from
    // the browser — *.vdocipher.com alone doesn't cover that origin.
    "connect-src 'self' https://*.razorpay.com https://*.vdocipher.com https://*.s3-accelerate.amazonaws.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://*.analytics.google.com",
    "frame-src 'self' https://*.razorpay.com https://*.vdocipher.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = buildCsp(nonce);

  // Ops gate — redirect unauthenticated staff visitors to login.
  if (request.nextUrl.pathname.startsWith('/ops')) {
    if (!request.cookies.has('fs_token_staff')) {
      const loginUrl = new URL('/auth/staff-login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      const redirect = NextResponse.redirect(loginUrl);
      redirect.headers.set('content-security-policy', csp);
      return redirect;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // Next.js reads this request header to stamp the nonce onto its own
  // framework/chunk <script> tags automatically.
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [
    // All pages except API routes, Next internals and static asset files.
    // Skip prefetches so a nonce isn't baked into a reused RSC payload.
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
