import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/**
 * The website binds each Google sign-in to the browser that started it with a
 * random `state` nonce (see apps/web/app/auth/lib/oauth-state.ts). We only relay
 * it: it is sent to Google on the way out and echoed back to the callback, which
 * hands it to the frontend; the frontend does the comparison against what that
 * browser stored. So all that is needed here is a strict shape check - the value
 * ends up in a redirect URL, never anywhere else.
 */
export const OAUTH_STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function readOAuthState(req: Pick<Request, 'query'>): string | undefined {
  const raw = req.query?.state;
  return typeof raw === 'string' && OAUTH_STATE_PATTERN.test(raw) ? raw : undefined;
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  // Called by passport for the redirect to Google (/auth/google). On the callback
  // leg Google supplies `state` itself, so nothing is added there.
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const state = readOAuthState(req);
    return state ? { state } : {};
  }
}
