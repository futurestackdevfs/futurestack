import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') as string,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') as string,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') as string,
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile
  ) {
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const googleId = profile.id;
    const avatarUrl = profile.photos?.[0]?.value;

    const emailVerified = (profile as any)._json?.email_verified;
    console.log((profile as any)._json);

    if (!email) {
      throw new UnauthorizedException('Google profile did not return an email');
    }

    if (!emailVerified) {
      throw new UnauthorizedException('Google account email is not verified')
    }

    const user = await this.authService.validateOAuthUser({
      email,
      name,
      googleId,
      avatarUrl
    });

    return user;
  }
}