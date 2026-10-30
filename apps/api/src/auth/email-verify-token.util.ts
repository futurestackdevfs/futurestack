import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Stateless, signed "confirm your email" token — no database column needed.
 *
 * It is deliberately NOT a JWT: it is signed with a key derived from the JWT
 * secret under a different label, so it can never be accepted as a login
 * token (or forged from one). It carries the email it was issued for, so a
 * link becomes useless if the account's email ever changes.
 */
const KEY_LABEL = 'fs:email-verify:v1';
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

function signingKey(secret: string): Buffer {
  return createHmac('sha256', secret).update(KEY_LABEL).digest();
}

function sign(secret: string, payload: string): string {
  return createHmac('sha256', signingKey(secret)).update(payload).digest('base64url');
}

export function createEmailVerifyToken(
  secret: string,
  userId: string,
  email: string,
  now: number = Date.now(),
  ttlMs: number = EMAIL_VERIFY_TTL_MS,
): string {
  const payload = Buffer.from(
    JSON.stringify({ u: userId, e: email.toLowerCase(), x: now + ttlMs }),
  ).toString('base64url');
  return `${payload}.${sign(secret, payload)}`;
}

/** The user id + email the token was issued for, or null if it is forged, malformed or expired. */
export function readEmailVerifyToken(
  secret: string,
  token: string,
  now: number = Date.now(),
): { userId: string; email: string } | null {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(secret, payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      u?: unknown;
      e?: unknown;
      x?: unknown;
    };
    if (typeof body.u !== 'string' || typeof body.e !== 'string' || typeof body.x !== 'number') return null;
    if (body.x < now) return null;
    return { userId: body.u, email: body.e };
  } catch {
    return null;
  }
}
