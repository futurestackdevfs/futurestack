import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Guards the (token-less) VdoCipher webhook routes.
 *
 * VdoCipher cannot present a user JWT, so instead we require a shared secret
 * that only VdoCipher (configured in its dashboard) and this server know.
 * Configure the same value as:
 *   - env  VDOCIPHER_WEBHOOK_SECRET
 *   - VdoCipher dashboard → Webhooks → sent as the `x-vdocipher-secret`
 *     header, or as a `?secret=` query param on the webhook URL.
 *
 * Fails CLOSED: if the secret is not configured, every webhook is rejected
 * (503) rather than silently accepting unauthenticated state changes.
 */
@Injectable()
export class VdoCipherWebhookGuard implements CanActivate {
  private readonly logger = new Logger(VdoCipherWebhookGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('VDOCIPHER_WEBHOOK_SECRET')?.trim();
    if (!expected) {
      this.logger.error(
        'VDOCIPHER_WEBHOOK_SECRET is not set — refusing all VdoCipher webhooks. ' +
          'Set it in the API env and in the VdoCipher dashboard webhook config.',
      );
      throw new ServiceUnavailableException('Webhook receiver not configured');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const headerValue = req.headers['x-vdocipher-secret'];
    const authHeader = req.headers['authorization'];
    const queryValue = req.query?.secret;

    const provided =
      (typeof headerValue === 'string' && headerValue) ||
      // supports "Authorization: Apikey <secret>" / "Bearer <secret>"
      (typeof authHeader === 'string' &&
        authHeader.replace(/^(Apikey|Bearer)\s+/i, '')) ||
      (typeof queryValue === 'string' && queryValue) ||
      '';

    if (!provided || !this.timingSafeEqual(provided, expected)) {
      this.logger.warn('VdoCipher webhook rejected — bad or missing secret');
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return true;
  }

  private timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
