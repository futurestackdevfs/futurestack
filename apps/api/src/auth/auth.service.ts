import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

type SafeUser = Omit<User, 'password'>;

interface OAuthProfile {
  email: string;
  name: string;
  googleId: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private stripPassword(user: User): SafeUser {
    const { password, ...safeUser } = user;
    return safeUser;
  }

  private signToken(user: SafeUser) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  /**
   * Used by RegisterDto flow — students only, self-serve signup.
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: Role.STUDENT,
      },
    });

    const safeUser = this.stripPassword(user);
    return {
      accessToken: this.signToken(safeUser),
      user: safeUser,
    };
  }

  /**
   * Used by LocalStrategy. Returns null on any failure so the strategy
   * can throw a generic UnauthorizedException (don't leak which part failed).
   */
  async validateUser(email: string, password: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      // user.password is null for OAuth-only accounts — no local login possible
      return null;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is suspended');
    }

    return this.stripPassword(user);
  }

  /**
   * Used by GoogleStrategy. Finds an existing user by googleId or email,
   * links the googleId if missing, or creates a new STUDENT account.
   * OAuth signup is student-only — staff roles are provisioned manually.
   */
  async validateOAuthUser(profile: OAuthProfile): Promise<SafeUser> {
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (user) {
        // Existing email/password account signing in with Google for the first time
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.googleId },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleId: profile.googleId,
            role: Role.STUDENT,
            avatarUrl: profile.avatarUrl,
            emailVerified: true
          },
        });
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is suspended');
    }

    return this.stripPassword(user);
  }

  /**
   * Used by /auth/login and /auth/google/callback once a user has
   * already been validated by the relevant strategy.
   */
  async login(user: SafeUser) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: this.signToken(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}