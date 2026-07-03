import { loadStaffToken } from "@/app/auth/lib/token-store";

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
 */
export async function opsFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await loadStaffToken().catch(() => null);
  if (!token) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/staff-login";
    }
    throw new Error("No staff session — redirecting to staff login.");
  }

  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
