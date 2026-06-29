import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
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

    if (user.role === Role.TRAINER && user.approvalStatus !== 'APPROVED') {
      if (user.approvalStatus === 'REJECTED') {
        throw new UnauthorizedException('Your trainer application was not approved');
      }
      throw new UnauthorizedException('Your trainer account is pending admin approval');
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

    return {
      accessToken: this.signToken(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
    };
  }

  /**
   * Always returns the same generic message regardless of whether the
   * email exists, has no password (OAuth-only), or a reset email was
   * actually sent — this prevents attackers from using this endpoint to
   * enumerate which emails are registered.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericResponse = {
      message: 'If an account with that email exists, a reset link has been sent.',
    };

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      // No account, or an OAuth-only account with no local password to reset
      return genericResponse;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires,
      },
    });

    const frontendUrl =
<<<<<<< HEAD
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${rawToken}`;
  
=======
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

>>>>>>> 6b056dc7a95e2d8de25e98037e56cc82b2902b43
    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
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
      },
    });

    return { message: 'Password has been reset successfully' };
  }
}