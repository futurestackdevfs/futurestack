import { NextResponse } from 'next/server';

const BACKEND = process.env.API_URL ?? 'http://localhost:3002';

// Redirect the browser directly to the NestJS OAuth initiation endpoint.
// The BFF catch-all proxy uses fetch() which follows redirects internally —
// Google's consent redirect would never reach the browser. This dedicated
// route returns a 302 that the browser follows itself, keeping the full
// OAuth redirect chain intact.
export async function GET() {
  return NextResponse.redirect(`${BACKEND}/auth/google`);
}
