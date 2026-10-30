import { createEmailVerifyToken, readEmailVerifyToken } from './email-verify-token.util';

const SECRET = 'x'.repeat(40);
const now = 1_800_000_000_000;

describe('email verify token', () => {
  it('round-trips the user id and (lower-cased) email', () => {
    const t = createEmailVerifyToken(SECRET, 'user-1', 'Ram@Example.com', now);
    expect(readEmailVerifyToken(SECRET, t, now + 1000)).toEqual({ userId: 'user-1', email: 'ram@example.com' });
  });

  it('expires after 24 hours', () => {
    const t = createEmailVerifyToken(SECRET, 'user-1', 'a@b.co', now);
    expect(readEmailVerifyToken(SECRET, t, now + 23 * 3600_000)).not.toBeNull();
    expect(readEmailVerifyToken(SECRET, t, now + 25 * 3600_000)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const t = createEmailVerifyToken('y'.repeat(40), 'user-1', 'a@b.co', now);
    expect(readEmailVerifyToken(SECRET, t, now)).toBeNull();
  });

  it('rejects a tampered payload (e.g. swapping the user id)', () => {
    const t = createEmailVerifyToken(SECRET, 'user-1', 'a@b.co', now);
    const [, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ u: 'admin', e: 'a@b.co', x: now + 1e9 })).toString('base64url');
    expect(readEmailVerifyToken(SECRET, `${forged}.${sig}`, now)).toBeNull();
  });

  it('rejects garbage', () => {
    for (const bad of ['', 'abc', 'a.b.c', '.', 'a.', '.b']) {
      expect(readEmailVerifyToken(SECRET, bad, now)).toBeNull();
    }
  });

  it('is not interchangeable with a plain JWT-style token', () => {
    const jwtLike =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEiLCJleHAiOjk5OTk5OTk5OTl9.abc';
    expect(readEmailVerifyToken(SECRET, jwtLike, now)).toBeNull();
  });
});
