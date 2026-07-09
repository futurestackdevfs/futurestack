/**
 * Per-trainer localStorage persistence for records that have no backend model
 * yet (sessions, curriculum feedback). Keyed by trainer id so multiple staff
 * accounts on one machine don't see each other's drafts.
 */

function key(trainerId: string, name: string) {
  return `fs-trainer-${trainerId}-${name}`;
}

export function loadLocal<T>(trainerId: string, name: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key(trainerId, name));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocal<T>(trainerId: string, name: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(trainerId, name), JSON.stringify(value));
  } catch {
    /* storage full / private mode — non-fatal */
  }
}
