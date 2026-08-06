// Shared "session expired" signal. Every fetch wrapper must call this when an
// authenticated 401 survives the refresh attempt, so the SessionExpiredModal
// popup fires consistently across the whole app (student fetcher, authApi,
// authFetch and the ops/staff opsFetch) instead of only on some requests.
//
// The role is carried so the modal can re-issue the refresh with the right
// cookie (student vs staff) before redirecting.
export function reportSessionExpired(role?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<{ role?: string }>('fs:session-expired', {
      detail: role ? { role } : {},
    }),
  );
}
