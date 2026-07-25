import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  emailVerified?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  validate(payload: JwtPayload) {
    // JWT signature is already verified by passport-jwt before this runs.
    // No DB lookup needed — trust the signed payload.
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      avatarUrl: payload.avatarUrl,
      emailVerified: payload.emailVerified,
    };
  }
}