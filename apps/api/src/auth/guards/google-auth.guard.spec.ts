import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { GoogleAuthGuard, readOAuthState } from './google-auth.guard';

const ctxFor = (query: Record<string, unknown>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ query }) }) }) as unknown as ExecutionContext;

const GOOD_STATE = 'AbCdEfGh1234_-xyzAbCdEfGh1234_-xyz';

describe('Google sign-in `state` relay (login-CSRF binding)', () => {
  describe('readOAuthState()', () => {
    it('accepts a url-safe nonce of 16-128 characters', () => {
      expect(readOAuthState({ query: { state: GOOD_STATE } } as any)).toBe(GOOD_STATE);
    });

    it.each([
      ['missing', {}],
      ['empty', { state: '' }],
      ['too short', { state: 'abc123' }],
      ['too long', { state: 'a'.repeat(129) }],
      ['contains a quote', { state: 'abcdefghijklmnop"onload=alert(1)' }],
      ['contains & and #', { state: 'abcdefghijklmnop&token=evil#x' }],
      ['contains a newline', { state: 'abcdefghijklmnop\nSet-Cookie: x=1' }],
      ['an array (?state=a&state=b)', { state: [GOOD_STATE, GOOD_STATE] }],
      ['an object (?state[x]=y)', { state: { x: GOOD_STATE } }],
    ])('rejects %s', (_label, query) => {
      expect(readOAuthState({ query } as any)).toBeUndefined();
    });
  });

  describe('GoogleAuthGuard.getAuthenticateOptions()', () => {
    const guard = new GoogleAuthGuard();

    it('passes a valid state through to Google', () => {
      expect(guard.getAuthenticateOptions(ctxFor({ state: GOOD_STATE }))).toEqual({ state: GOOD_STATE });
    });

    it('sends nothing extra when state is absent or malformed', () => {
      expect(guard.getAuthenticateOptions(ctxFor({}))).toEqual({});
      expect(guard.getAuthenticateOptions(ctxFor({ state: 'bad state!' }))).toEqual({});
    });
  });

  describe('AuthController.googleCallback() redirect', () => {
    function setup() {
      const authService = {
        login: jest.fn().mockResolvedValue({ accessToken: 'jwt.tok.en', rawRefreshToken: 'raw refresh/token' }),
      } as unknown as AuthService;
      const config = {
        get: jest.fn((k: string) =>
          ({ GOOGLE_REDIRECT_URL: 'https://app.example.com/auth/oauth/callback' } as Record<string, string>)[k],
        ),
      } as unknown as ConfigService;
      const controller = new AuthController(authService, config);
      const res = { redirect: jest.fn(), cookie: jest.fn() } as any;
      return { controller, res };
    }

    it('echoes the state in the fragment so the callback page can verify the sign-in', async () => {
      const { controller, res } = setup();

      await controller.googleCallback({ user: { id: 'u1', role: Role.STUDENT }, query: { state: GOOD_STATE } } as any, res);

      expect(res.redirect).toHaveBeenCalledWith(
        `https://app.example.com/auth/oauth/callback#token=jwt.tok.en&refresh=raw%20refresh%2Ftoken&state=${GOOD_STATE}`,
      );
    });

    it('never echoes a malformed state into the redirect URL', async () => {
      const { controller, res } = setup();

      await controller.googleCallback(
        { user: { id: 'u1', role: Role.STUDENT }, query: { state: 'x&token=evil#' } } as any,
        res,
      );

      const url = res.redirect.mock.calls[0][0] as string;
      expect(url).not.toContain('state=');
      expect(url).not.toContain('evil');
    });

    it('still redirects when no state was supplied (older clients)', async () => {
      const { controller, res } = setup();

      await controller.googleCallback({ user: { id: 'u1', role: Role.STUDENT }, query: {} } as any, res);

      expect(res.redirect).toHaveBeenCalledWith(
        'https://app.example.com/auth/oauth/callback#token=jwt.tok.en&refresh=raw%20refresh%2Ftoken',
      );
    });
  });
});
