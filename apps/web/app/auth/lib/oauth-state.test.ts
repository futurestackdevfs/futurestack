// Run with:  node --test app/auth/lib/oauth-state.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OAUTH_STATE_PATTERN, newOAuthState, oauthStateMatches } from './oauth-state.ts';

test('newOAuthState() makes url-safe, unguessable, distinct nonces the API will accept', () => {
  const a = newOAuthState();
  const b = newOAuthState();
  assert.match(a, OAUTH_STATE_PATTERN);
  assert.match(b, OAUTH_STATE_PATTERN);
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
});

test('oauthStateMatches() accepts only the exact stored nonce', () => {
  const s = newOAuthState();
  assert.equal(oauthStateMatches(s, s), true);
});

test('oauthStateMatches() rejects a different, missing or malformed value', () => {
  const s = newOAuthState();
  assert.equal(oauthStateMatches(newOAuthState(), s), false); // attacker-supplied state
  assert.equal(oauthStateMatches(null, s), false); // crafted link with no state
  assert.equal(oauthStateMatches(s, null), false); // victim not mid-sign-in
  assert.equal(oauthStateMatches(null, null), false);
  assert.equal(oauthStateMatches('', ''), false);
  assert.equal(oauthStateMatches('short', 'short'), false); // below the minimum length
  assert.equal(oauthStateMatches(s + 'x', s), false);
});
