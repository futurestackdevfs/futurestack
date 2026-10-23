import { saveToken, saveStaffToken } from './token-store';
import { decodeClaims, STAFF_MARKER, STUDENT_MARKER } from './token-claims';

export type RefreshResult = {
  accessToken: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    avatarUrl?: string;
    emailVerified?: boolean;
  };
} | null;

const inFlight = new Map<string, Promise<RefreshResult>>();

function decodeJwt(t: string) {
  try {
    return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/**
 * Single-flight session refresh. When the access token expires, several
 * parallel requests hit 401 at the same time and all try to refresh — but the
 * backend rotates (consumes) the refresh token on every refresh, so concurrent
 * refreshes race each other and the losers get "Refresh token is invalid or
 * expired" (and can even wipe the whole token family). This ensures only ONE
 * refresh request runs per role; everyone else awaits the same promise.
 */
/**
 * Refresh up-front when the access token is expired or about to expire, so the
 * first request already carries a fresh cookie instead of 401-ing (which used
 * to leave dashboards showing 0s until a few reloads). No-op when the expiry is
 * unknown (older sessions) — the reactive 401 path still covers those.
 */
export async function ensureFreshSession(staff: boolean): Promise<void> {
  const claims = decodeClaims(staff ? STAFF_MARKER : STUDENT_MARKER);
  if (!claims?.exp || claims.exp * 1000 - Date.now() > 30_000) return;
  await refreshSession(staff ? claims.role : undefined).catch(() => null);
}

export async function refreshSession(role?: string): Promise<RefreshResult> {
  const key = role ?? 'STUDENT';
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const qs = key !== 'STUDENT' ? `?role=${key}` : '';
      const res = await fetch(`/api/auth/refresh${qs}`, { method: 'POST' });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.accessToken) return null;

      const payload = decodeJwt(data.accessToken);
      const uid = payload?.sub;
      const role = payload?.role;
      if (uid) {
        if (role && role !== 'STUDENT') await saveStaffToken(uid, data.accessToken);
        else await saveToken(uid, data.accessToken);
      }
      // Update the BFF proxy cookie so subsequent calls don't use the expired JWT.
      // Awaited on purpose: the cookie is now the only place the client's token
      // lives (requests carry a marker the proxy resolves from it), so returning
      // before it lands would let the next request go out with the stale JWT.
      await fetch(role && role !== 'STUDENT' ? '/api/auth/set-token-staff' : '/api/auth/set-token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: data.accessToken }),
      }).catch(() => {});
      return { accessToken: data.accessToken, user: data.user };
    } catch {
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}
