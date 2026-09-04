import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class BlogApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];
    const expectedKey = process.env.BLOG_INTERNAL_API_KEY;

    if (!expectedKey) {
      throw new UnauthorizedException('API key not configured');
    }

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Missing x-api-key header');
    }

    // Constant-time comparison to prevent timing attacks
    try {
      const providedBuffer = Buffer.from(apiKey, 'utf8');
      const expectedBuffer = Buffer.from(expectedKey, 'utf8');

      if (providedBuffer.length !== expectedBuffer.length) {
        throw new UnauthorizedException('Invalid API key');
      }

      const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
      if (!isValid) {
        throw new UnauthorizedException('Invalid API key');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
