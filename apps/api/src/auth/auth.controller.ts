import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  Query
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterTrainerDto } from './dto/register-trainer.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieName(role: Role): string {
    const map: Record<Role, string> = {
      [Role.STUDENT]:         'fs_student_refresh',
      [Role.ADMIN]:           'fs_admin_refresh',
      [Role.TRAINER]:         'fs_trainer_refresh',
      [Role.CONTENT_MANAGER]: 'fs_cm_refresh',
      [Role.COORDINATOR]:     'fs_coordinator_refresh',
      [Role.SUPPORT]:         'fs_support_refresh',
    };
    return map[role] ?? 'fs_ops_refresh';
  }

  private setRefreshTokenCookie(res: Response, rawToken: string, role: Role) {
    res.cookie(this.getCookieName(role), rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  private clearRefreshTokenCookie(res: Response, role: Role) {
    res.clearCookie(this.getCookieName(role), { path: '/' });
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, rawRefreshToken, user } = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, rawRefreshToken, Role.STUDENT);
    return { accessToken, user };
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register-trainer')
  async registerTrainer(@Body() dto: RegisterTrainerDto) {
    return this.authService.registerTrainer(dto);
  }

  // LocalAuthGuard runs LocalStrategy.validate() against the body,
  // then attaches the result to req.user before this handler runs.
  // @Body() dto here is just for Swagger/typing — LocalStrategy already
  // read email/password directly off the request.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as { role: Role };
  
    // Credentials are already verified at this point (LocalAuthGuard ran
    // first) — this only gates WHICH portal a verified account is allowed
    // to log in through. Omit `portal` from the request and this check
    // is skipped entirely (backward-compatible).
    if (dto.portal === 'student' && user.role !== Role.STUDENT) {
      throw new UnauthorizedException('Please use the staff login page for this account');
    }
  
    if (dto.portal === 'ops' && user.role === Role.STUDENT) {
      throw new UnauthorizedException('Please use the student login page for this account');
    }
  
    const { accessToken, rawRefreshToken, user: safeUser } =
      await this.authService.login(req.user as any);

    // Set role-scoped HttpOnly cookie — each role gets its own cookie name
    // so multiple personas can be active simultaneously in the same browser
    this.setRefreshTokenCookie(res, rawRefreshToken, user.role);

    return { accessToken, user: safeUser };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    return req.user;
  }

  // Kicks off the redirect to Google's consent screen.
  // No handler body needed — GoogleAuthGuard does the redirect.
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  async googleLogin() {}

  // Google redirects back here after consent. GoogleStrategy has already
  // upserted the user and attached it to req.user by this point.
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken, rawRefreshToken } =
      await this.authService.login(req.user as any);

    this.setRefreshTokenCookie(res, rawRefreshToken, Role.STUDENT);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    return res.redirect(
      `${frontendUrl}/api/auth/oauth/session?token=${accessToken}`,
    );
  }

  @Post('refresh')
  async refresh(
    @Query('role') role: Role = Role.STUDENT,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = this.getCookieName(role);
    const rawToken = req.cookies?.[cookieName];

    if (!rawToken) {
      throw new UnauthorizedException('No refresh token found');
    }

    const { accessToken, newRawRefreshToken, user: safeUser } =
      await this.authService.refreshTokens(rawToken);

    // Use role from DB (safeUser.role), not the query param —
    // prevents a client from lying about their role to get the wrong cookie
    this.setRefreshTokenCookie(res, newRawRefreshToken, safeUser.role as Role);

    return { accessToken, user: safeUser };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as { id: string; role: Role };
    const cookieName = this.getCookieName(user.role);
    const rawToken = req.cookies?.[cookieName];

    await this.authService.logout(rawToken ?? '');
    this.clearRefreshTokenCookie(res, user.role);

    return { message: 'Logged out successfully' };
  }

  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }


}