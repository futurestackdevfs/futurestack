import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterTrainerDto } from './dto/register-trainer.dto';
import { MailService } from '../mail/mail.service';

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
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  private stripPassword(user: User): SafeUser {
    const { password, ...safeUser } = user;
    return safeUser;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateRawRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private async cleanupExpiredTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
  }

  async createRefreshToken(userId: string): Promise<string> {
    await this.cleanupExpiredTokens(userId);
    const raw = this.generateRawRefreshToken();
    const hash = this.hashToken(raw);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: { tokenHash: hash, userId, expiresAt },
    });

    return raw;
  }

  /**
   * Rotation with a grace window for concurrent refreshes.
   *
   * When the access JWT expires, several in-flight requests hit 401 at the
   * same time and each one calls this endpoint. Classic rotation deletes the
   * old row on first use, so the losing requests find the hash gone and get
   * 401 — or worse, trip the replay guard and wipe every token for the user.
   *
   * Instead we soft-rotate: set `revokedAt` on the consumed token and, if the
   * incoming token was revoked by the SAME user within the last 60s, treat it
   * as a legit concurrent refresh and issue a fresh token rather than failing.
   */
  async refreshTokens(rawToken: string): Promise<{
    accessToken: string;
    newRawRefreshToken: string;
    user: SafeUser;
  }> {
    const hash = this.hashToken(rawToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      // Missing or genuinely expired token — clean up the row if present and reject.
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { tokenHash: hash } });
      }
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Account is suspended');
    }

    // Atomically consume the token. If another request already consumed it
    // (`updated.count === 0`), give it a short grace window: a just-rotated
    // token means a legit concurrent refresh, not a replay, so issue a fresh
    // token instead of killing the session. An old revokedAt (or one set in
    // the microseconds between our read and update) is treated as just-rotated
    // too — the only hard reject is a token revoked more than 60s ago.
    const updated = await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (updated.count === 0 && stored.revokedAt) {
      const rotatedRecently =
        Date.now() - stored.revokedAt.getTime() <= 60_000;
      if (!rotatedRecently) {
        throw new UnauthorizedException('Refresh token has already been used');
      }
    }

    const newRawRefreshToken = await this.createRefreshToken(stored.userId);

    const safeUser = this.stripPassword(stored.user);
    const accessToken = this.signToken(safeUser);

    return { accessToken, newRawRefreshToken, user: safeUser };
  }

  async logout(rawToken: string, userId?: string): Promise<void> {
    // Revoke ALL refresh tokens for this user (not just the one used to logout)
    if (userId) {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    } else if (rawToken) {
      const hash = this.hashToken(rawToken);
      await this.prisma.refreshToken.deleteMany({ where: { tokenHash: hash } });
    }
  }

  private signToken(user: SafeUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      emailVerified: user.emailVerified ?? false,
    };
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

    const rawRefreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken: this.signToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      } as SafeUser),
      rawRefreshToken,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
    };
  }

  /**
   * Trainer self-registration. Unlike student register(), this does NOT
   * return an accessToken — the account is created in PENDING state and
   * can't log in until an admin approves it. validateUser() below enforces
   * this gate.
   */
  async registerTrainer(dto: RegisterTrainerDto): Promise<{ message: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: Role.TRAINER,
        approvalStatus: 'PENDING',
        bio: dto.bio,
        yearsExperience: dto.yearsExperience,
      },
    });

    return {
      message:
        'Your trainer account has been submitted for review. You will be able to log in once an admin approves it.',
    };
  }

  /**
   * Used by LocalStrategy. Returns null on any failure so the strategy
   * can throw a generic UnauthorizedException (don't leak which part failed).
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<SafeUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { companyId: email }],
      },
    });

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

    if (
      user.passwordExpiresAt &&
      user.passwordExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException(
        'Your temporary password has expired. Use the forgot-password link to set a new one.',
      );
    }

    if (user.role === Role.TRAINER && user.approvalStatus !== 'APPROVED') {
      if (user.approvalStatus === 'REJECTED') {
        throw new UnauthorizedException(
          'Your trainer application was not approved',
        );
      }
      throw new UnauthorizedException(
        'Your trainer account is pending admin approval',
      );
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
            avatarUrl: profile.avatarUrl,
            emailVerified: true,
            role: Role.STUDENT,
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

    const rawRefreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken: this.signToken(user),
      rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  /**
   * Sets a brand-new password for a user who was provisioned by an admin
   * (mustChangePassword=true). Used on first login so the staff member can
   * replace their auto-generated temporary password with their own.
   */
  async setPassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordExpiresAt: null,
      },
    });

    return { message: 'Password has been set successfully' };
  }

  /**
   * Always returns the same generic message regardless of whether the
   * email exists, has no password (OAuth-only), or a reset email was
   * actually sent — this prevents attackers from using this endpoint to
   * enumerate which emails are registered.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericResponse = {
      message:
        'If an account with that email exists, a reset link has been sent.',
    };

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { companyId: email }],
      },
    });

    if (!user || !user.password) {
      // No account, or an OAuth-only account with no local password to reset
      return genericResponse;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires,
      },
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);

    return genericResponse;
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordExpiresAt: null,
      },
    });

    return { message: 'Password has been reset successfully' };
  }
}
