export type Claims = {
  sub?: string;
  name?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
};

// The access token lives only in an HttpOnly cookie (JS can't read it). What
// the client holds instead is this marker, which the BFF proxy swaps for the
// real cookie value, plus the non-secret claims below for UI decisions. The
// backend still authorizes every request from the real JWT.
export const STUDENT_MARKER = 'cookie:student';
export const STAFF_MARKER = 'cookie:staff';

export const STUDENT_CLAIMS_KEY = 'fs_claims';
export const STAFF_CLAIMS_KEY = 'fs_staff_claims';

export function isSessionMarker(t?: string | null): boolean {
  return t === STUDENT_MARKER || t === STAFF_MARKER;
}

export function decodeJwtPayload(t?: string | null): Claims | null {
  if (!t) return null;
  try {
    return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function pickClaims(p: Claims): Claims {
  return {
    sub: p.sub,
    name: p.name,
    email: p.email,
    role: p.role,
    avatarUrl: p.avatarUrl,
    emailVerified: p.emailVerified,
  };
}

/** Claims for either a real JWT or a session marker. */
export function decodeClaims(t?: string | null): Claims | null {
  if (!t) return null;
  if (isSessionMarker(t)) {
    try {
      const raw = localStorage.getItem(t === STAFF_MARKER ? STAFF_CLAIMS_KEY : STUDENT_CLAIMS_KEY);
      return raw ? (JSON.parse(raw) as Claims) : null;
    } catch {
      return null;
    }
  }
  return decodeJwtPayload(t);
}
