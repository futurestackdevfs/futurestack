/**
 * Same-origin guard for state-changing Route Handlers.
 *
 * Next.js checks Origin against Host for Server Actions, but NOT for Route
 * Handlers (app/api/**\/route.ts). A Route Handler that changes browser state -
 * here: sets or clears the HttpOnly session cookies - can therefore be driven
 * by any other website: a cross-site <form method="post" enctype="text/plain">
 * needs no CORS preflight, and SameSite=Lax cookies are still SET from the
 * response to a cross-site navigation. That lets an attacker plant their own
 * session in a victim's browser ("login CSRF").
 *
 * This accepts a request only when the browser says it came from this very site:
 *  - Sec-Fetch-Site, when sent, must be "same-origin"; and
 *  - Origin, when sent, must name one of the hosts this request was addressed to;
 *  - one of the two must be present (a bare request with neither is refused).
 * Requests that need a JSON body must also declare it (a forged text/plain form
 * post cannot).
 *
 * Kept free of `next/*` imports so it can be unit-tested with plain Headers.
 */
export interface SameOriginInput {
  headers: Pick<Headers, 'get'>;
  /** Host of the URL Next.js resolved for this request (req.nextUrl.host). */
  urlHost?: string;
}

function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

/** True only for a request that originated from this site's own pages. */
export function isSameOriginRequest({ headers, urlHost }: SameOriginInput): boolean {
  const site = headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return false;

  const origin = headers.get('origin');
  if (origin) {
    const originHost = hostOf(origin);
    if (!originHost) return false;
    const ownHosts = [headers.get('x-forwarded-host'), headers.get('host'), urlHost]
      .filter((h): h is string => !!h)
      // x-forwarded-host can carry a comma-separated chain; the first is the public one
      .map((h) => h.split(',')[0].trim().toLowerCase());
    return ownHosts.includes(originHost);
  }

  // No Origin header: trust only an explicit same-origin signal from the browser.
  return site === 'same-origin';
}

/** Same as above, and the request body must be declared as JSON. */
export function isSameOriginJsonRequest(input: SameOriginInput): boolean {
  const type = (input.headers.get('content-type') ?? '').toLowerCase();
  return type.startsWith('application/json') && isSameOriginRequest(input);
}
