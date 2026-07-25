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

// ── Student token store ──

export async function saveToken(userId: string, token: string): Promise<void> {
  const key = await hashUserId(userId);
  localStorage.setItem(UID_KEY, userId);
  localStorage.setItem(key, token);
}

export async function loadToken(): Promise<string | null> {
  const uid = localStorage.getItem(UID_KEY);
  if (!uid) return null;
  const key = await hashUserId(uid);
  return localStorage.getItem(key);
}

export async function clearToken(): Promise<void> {
  const uid = localStorage.getItem(UID_KEY);
  if (uid) {
    const key = await hashUserId(uid);
    localStorage.removeItem(key);
  }
  localStorage.removeItem(UID_KEY);
}

// ── Staff token store (separate from student to prevent cross-portal auth) ──

export async function saveStaffToken(userId: string, token: string): Promise<void> {
  const key = `staff_${await hashUserId(userId)}`;
  localStorage.setItem(STAFF_UID_KEY, userId);
  localStorage.setItem(key, token);
}

export async function loadStaffToken(): Promise<string | null> {
  const uid = localStorage.getItem(STAFF_UID_KEY);
  if (!uid) return null;
  const key = `staff_${await hashUserId(uid)}`;
  return localStorage.getItem(key);
}

export async function clearStaffToken(): Promise<void> {
  const uid = localStorage.getItem(STAFF_UID_KEY);
  if (uid) {
    const key = `staff_${await hashUserId(uid)}`;
    localStorage.removeItem(key);
  }
  localStorage.removeItem(STAFF_UID_KEY);
}
