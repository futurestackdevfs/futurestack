import { ensureFreshSession, refreshSession } from './refresh-session';
import { STAFF_MARKER, STUDENT_MARKER, decodeClaims } from './token-claims';

/**
 * Global safety net for raw `fetch('/api/...')` calls.
 *
 * Many screens (ops dashboards, student sections) call plain `fetch` and swallow
 * errors with `.catch(() => null / [])`. When the access token had expired the
 * first request 401'd, nothing refreshed the session, and the UI rendered 0s
 * until a few reloads. This wraps `window.fetch` once so any same-origin
 * `/api/*` call (except `/api/auth/*`) refreshes the session first when it is
 * about to expire, and transparently refreshes + retries once on a 401 — the
 * caller just sees the successful response.
 */
let installed = false;

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.pathname + input.search;
  return input.url;
}

function pathOf(raw: string): string | null {
  try {
    const u = new URL(raw, window.location.origin);
    return u.origin === window.location.origin ? u.pathname : null;
  } catch {
    return null;
  }
}

function hasSession(staff: boolean): boolean {
  try {
    return !!localStorage.getItem(staff ? 'fs_staff_claims' : 'fs_claims');
  } catch {
    return false;
  }
}

export function installFetchAutoRefresh() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const path = pathOf(urlOf(input));
    if (!path || !path.startsWith('/api/') || path.startsWith('/api/auth/')) {
      return nativeFetch(input, init);
    }

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const auth = headers.get('authorization') ?? '';
    const staff = /cookie:staff/i.test(auth)
      ? true
      : /cookie:student/i.test(auth)
        ? false
        : window.location.pathname.startsWith('/ops');

    // No session for this portal → public call, leave it alone.
    if (!hasSession(staff)) return nativeFetch(input, init);

    // Replayable only if the body can be sent twice.
    const replayable = !init?.body || typeof init.body === 'string' || init.body instanceof FormData || init.body instanceof URLSearchParams || init.body instanceof Blob;
    const retryInput = input instanceof Request ? input.clone() : input;

    await ensureFreshSession(staff);
    const res = await nativeFetch(input, init);
    if (res.status !== 401 || !replayable) return res;

    const claims = decodeClaims(staff ? STAFF_MARKER : STUDENT_MARKER);
    const refreshed = await refreshSession(staff ? claims?.role : undefined).catch(() => null);
    if (!refreshed) return res;

    // The fresh token now lives in the cookie; make sure the retry points at it
    // even if the caller had captured a real JWT in its Authorization header.
    if (auth && !/cookie:(student|staff)/i.test(auth)) {
      headers.set('authorization', `Bearer ${staff ? STAFF_MARKER : STUDENT_MARKER}`);
    }
    return nativeFetch(retryInput, { ...init, headers });
  };
}
