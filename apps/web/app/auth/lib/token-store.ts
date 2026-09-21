import {
  STAFF_CLAIMS_KEY,
  STAFF_MARKER,
  STUDENT_CLAIMS_KEY,
  STUDENT_MARKER,
  decodeJwtPayload,
  pickClaims,
} from './token-claims';

// The access token itself is never persisted here — it lives only in the
// HttpOnly cookie set by /api/auth/set-token[-staff]. This store keeps just the
// user id and non-secret claims, and hands out a session marker that the BFF
// proxy resolves to the real cookie token (see app/api/[...proxy]/route.ts).

const UID_KEY = 'fs_uid';
const STAFF_UID_KEY = 'fs_staff_uid';

async function hashUserId(uid: string): Promise<string> {
  const data = new TextEncoder().encode(uid);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `fs_${hex}`;
}

// Sessions created before the cookie-only change kept the JWT in localStorage
// under a hashed key. Convert them once (claims kept, JWT dropped) so users
// stay signed in, and re-sync the cookie from that token.
async function migrateLegacy(staff: boolean): Promise<void> {
  const uidKey = staff ? STAFF_UID_KEY : UID_KEY;
  const claimsKey = staff ? STAFF_CLAIMS_KEY : STUDENT_CLAIMS_KEY;
  const uid = localStorage.getItem(uidKey);
  if (!uid) return;
  const key = `${staff ? 'staff_' : ''}${await hashUserId(uid)}`;
  const legacy = localStorage.getItem(key);
  if (!legacy) return;
  const payload = decodeJwtPayload(legacy);
  if (payload && !localStorage.getItem(claimsKey)) {
    localStorage.setItem(claimsKey, JSON.stringify(pickClaims(payload)));
  }
  localStorage.removeItem(key);
  fetch(staff ? '/api/auth/set-token-staff' : '/api/auth/set-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: legacy }),
  }).catch(() => {});
}

async function save(staff: boolean, userId: string, token: string): Promise<void> {
  const payload = decodeJwtPayload(token);
  localStorage.setItem(staff ? STAFF_UID_KEY : UID_KEY, userId);
  if (payload) {
    localStorage.setItem(staff ? STAFF_CLAIMS_KEY : STUDENT_CLAIMS_KEY, JSON.stringify(pickClaims(payload)));
  }
}

async function load(staff: boolean): Promise<string | null> {
  await migrateLegacy(staff);
  const uid = localStorage.getItem(staff ? STAFF_UID_KEY : UID_KEY);
  if (!uid) return null;
  if (!localStorage.getItem(staff ? STAFF_CLAIMS_KEY : STUDENT_CLAIMS_KEY)) return null;
  return staff ? STAFF_MARKER : STUDENT_MARKER;
}

async function clear(staff: boolean): Promise<void> {
  const uidKey = staff ? STAFF_UID_KEY : UID_KEY;
  const uid = localStorage.getItem(uidKey);
  if (uid) localStorage.removeItem(`${staff ? 'staff_' : ''}${await hashUserId(uid)}`);
  localStorage.removeItem(uidKey);
  localStorage.removeItem(staff ? STAFF_CLAIMS_KEY : STUDENT_CLAIMS_KEY);
}

// ── Student session ──

/** Records the session's user id + claims. `token` is decoded, not stored. */
export const saveToken = (userId: string, token: string) => save(false, userId, token);
/** Returns the session marker, or null when there is no student session. */
export const loadToken = () => load(false);
export const clearToken = () => clear(false);

// ── Staff session (separate from student to prevent cross-portal auth) ──

export const saveStaffToken = (userId: string, token: string) => save(true, userId, token);
export const loadStaffToken = () => load(true);
export const clearStaffToken = () => clear(true);
