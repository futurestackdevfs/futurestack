// Browser-side binding for the Google sign-in round trip (login-CSRF protection).
//
// start:    loginWithGoogle() stores a random nonce in sessionStorage and passes it
//           to Google as `state`.
// callback: the API echoes `state` back in the URL fragment; the callback page
//           accepts the tokens only if it matches the nonce this tab stored.

export const OAUTH_STATE_KEY = 'fs_oauth_state';

/** Same shape the API accepts for `state` (see GoogleAuthGuard). */
export const OAUTH_STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function newOAuthState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  // base64url, no padding
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Constant-shape comparison of the returned state with the stored nonce. */
export function oauthStateMatches(returned: string | null, stored: string | null): boolean {
  if (!returned || !stored) return false;
  if (!OAUTH_STATE_PATTERN.test(returned) || !OAUTH_STATE_PATTERN.test(stored)) return false;
  if (returned.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < returned.length; i++) diff |= returned.charCodeAt(i) ^ stored.charCodeAt(i);
  return diff === 0;
}

/** Reads and clears the stored nonce (single use). */
export function takeStoredOAuthState(): string | null {
  try {
    const value = sessionStorage.getItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    return value;
  } catch {
    return null;
  }
}
