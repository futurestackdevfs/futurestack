import { type NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.API_URL ?? 'http://localhost:3002';

// Must match what the API accepts (GoogleAuthGuard) and app/auth/lib/oauth-state.ts.
const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

// Redirect the browser directly to the NestJS OAuth initiation endpoint.
// The BFF catch-all proxy uses fetch() which follows redirects internally —
// Google's consent redirect would never reach the browser. This dedicated
// route returns a 302 that the browser follows itself, keeping the full
// OAuth redirect chain intact.
//
// `state` is the browser-bound nonce from loginWithGoogle(). It rides through
// Google and comes back in the callback fragment so /auth/oauth/callback can
// prove the sign-in was started by this very browser.
export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get('state');
  if (!state || !STATE_PATTERN.test(state)) {
    return NextResponse.redirect(new URL('/?error=oauth_state', req.url));
  }
  return NextResponse.redirect(`${BACKEND}/auth/google?state=${encodeURIComponent(state)}`);
}
