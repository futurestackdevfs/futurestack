import { saveToken, saveStaffToken } from './token-store';

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
      // Update the BFF proxy cookie so subsequent calls don't use the expired JWT
      fetch(role && role !== 'STUDENT' ? '/api/auth/set-token-staff' : '/api/auth/set-token', {
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
