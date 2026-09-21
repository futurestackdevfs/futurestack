import { reportSessionExpired } from '@/app/auth/lib/session-events';
import { refreshSession } from '@/app/auth/lib/refresh-session';
import { decodeClaims } from '@/app/auth/lib/token-claims';

// Shared SWR fetcher — handles 401 session expiry and error responses
async function loadSessionToken(): Promise<string | null> {
  const { loadToken, loadStaffToken } = await import('@/app/auth/lib/token-store');
  const isOps = typeof window !== 'undefined' && window.location.pathname.startsWith('/ops');
  // Only load the token for the current portal — never cross-load
  return isOps ? await loadStaffToken() : await loadToken();
}

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const token = await loadSessionToken();

  const doFetch = (t?: string) => fetch(url, {
    credentials: 'same-origin',
    ...(t ? { headers: { Authorization: `Bearer ${t}` } } : {}),
  });

  let res = await doFetch(token ?? undefined);

  if (res.status === 401 && token) {
    try {
      const role = decodeClaims(token)?.role;
      const refreshed = await refreshSession(role);
      if (refreshed) {
        res = await doFetch(refreshed.accessToken);
      }
    } catch {
      // Refresh failed — fall through to error handling below
    }
  }

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      reportSessionExpired(decodeClaims(token ?? '')?.role);
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}
