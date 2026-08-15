import { loadStaffToken, saveStaffToken } from "@/app/auth/lib/token-store";
import { reportSessionExpired } from "@/app/auth/lib/session-events";
import { refreshSession } from "@/app/auth/lib/refresh-session";

function decodeJwtRole(t: string): string | undefined {
  try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch { return undefined; }
}

/**
 * Fetch wrapper for the STAFF/ops portal.
 *
 * Always attaches the staff token as an explicit `Authorization` header, so the
 * BFF proxy authenticates as the staff user instead of falling back to the
 * student cookie (`fs_token`). Without this, any ops call made without an
 * explicit token leaks the student's identity/session into the admin panel
 * (see app/api/[...proxy]/route.ts cookie precedence).
 *
 * Centralizing this here means new ops code can't forget to pass the token.
 * If there is no staff session, the caller is redirected to the staff login.
 *
 * Automatically refreshes the access token on 401 before giving up.
 */
export async function opsFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await loadStaffToken().catch(() => null);
  if (!token) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/staff-login";
    }
    throw new Error("No staff session — redirecting to staff login.");
  }

  const doFetch = (t: string) => fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      Authorization: `Bearer ${t}`,
    },
  });

  let res = await doFetch(token);
  if (res.status === 401) {
    const role = decodeJwtRole(token);
    try {
      const refreshed = await refreshSession(role);
      if (refreshed) {
        const staffUid = localStorage.getItem('fs_staff_uid');
        if (staffUid) await saveStaffToken(staffUid, refreshed.accessToken);
        res = await doFetch(refreshed.accessToken);
      }
    } catch {
      // refresh failed — return original 401
    }
    // Refresh failed (or no new token) — surface the session expiry popup.
    if (res.status === 401) reportSessionExpired(role);
  }

  return res;
}
