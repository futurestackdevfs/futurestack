import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  iat?: number; // issued-at (seconds) — set by jsonwebtoken
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
      issuer: 'futurestack-api',
      audience: 'futurestack',
    });
  }

  async validate(payload: JwtPayload) {
    // Re-check the user against the DB on every request — a revoked/suspended
    // account or a role change must take effect immediately, not after the
    // access token expires (~15 min).
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, isActive: true, emailVerified: true, passwordChangedAt: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is disabled or no longer exists');
    }

    // Any token minted before the last password change is dead — a password
    // reset logs out every existing session immediately.
    //
    // `iat` is JWT-spec whole seconds; passwordChangedAt is a DB timestamp
    // with millisecond precision. setPassword() mints the caller's *new*
    // token in the same request right after stamping passwordChangedAt, so
    // both can legitimately land in the same wall-clock second — comparing
    // raw milliseconds would then reject that brand-new token too (it was
    // issued microseconds after the stamp, but floors to the same second).
    // Floor passwordChangedAt to seconds before comparing so a token from
    // that same second is treated as post-change; anything from an earlier
    // second is still correctly rejected.
    if (
      user.passwordChangedAt &&
      payload.iat != null &&
      payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      throw new UnauthorizedException('Session ended — password was changed');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
    };
  }
}
