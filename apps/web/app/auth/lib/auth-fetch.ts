function decodeJwt(t?: string): { sub?: string; role?: string } | null {
  if (!t) return null;
  try {
    return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

import { reportSessionExpired } from './session-events';

/**
 * Fetch wrapper for authenticated requests. Attaches the access token as a
 * Bearer header and transparently refreshes the session once on a 401 before
 * giving up — so an expired JWT (15 min TTL on the backend) doesn't surface
 * as a hard "Unauthorized" error to the user mid-session.
 *
 * Mirrors the refresh logic in fetcher.ts / auth-api.ts / ops-fetch.ts so the
 * enroll/save flows get the same resilient behaviour as SWR and ops calls.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { loadToken, loadStaffToken, saveToken, saveStaffToken } = await import('@/app/auth/lib/token-store');
  const token = (await loadToken()) ?? (await loadStaffToken());
  if (!token) return fetch(input, init); // no session — let the caller handle it

  const doFetch = (t?: string) => fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  });

  let res = await doFetch(token);
  if (res.status === 401) {
    const payload = decodeJwt(token);
    const role = payload?.role;
    try {
      const qs = role && role !== 'STUDENT' ? `?role=${role}` : '';
      const refreshRes = await fetch(`/api/auth/refresh${qs}`, { method: 'POST' });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        if (data.accessToken) {
          const fresh = decodeJwt(data.accessToken);
          const uid = fresh?.sub ?? payload?.sub;
          if (uid) {
            if (fresh?.role && fresh.role !== 'STUDENT') await saveStaffToken(uid, data.accessToken);
            else await saveToken(uid, data.accessToken);
          }
          // Update the BFF proxy cookie so subsequent calls don't use the expired JWT
          fetch(fresh && fresh.role && fresh.role !== 'STUDENT' ? '/api/auth/set-token-staff' : '/api/auth/set-token', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token: data.accessToken }),
          }).catch(() => {});
          res = await doFetch(data.accessToken);
        }
      }
    } catch {
      // Refresh failed — fall through; caller sees the original 401
    }
    if (res.status === 401) reportSessionExpired(role);
  }

  return res;
}