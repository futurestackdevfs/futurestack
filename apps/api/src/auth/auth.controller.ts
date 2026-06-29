import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
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

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('register-trainer')
  async registerTrainer(@Body() dto: RegisterTrainerDto) {
    return this.authService.registerTrainer(dto);
  }

  // LocalAuthGuard runs LocalStrategy.validate() against the body,
  // then attaches the result to req.user before this handler runs.
  // @Body() dto here is just for Swagger/typing — LocalStrategy already
  // read email/password directly off the request.
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
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
  
    return this.authService.login(req.user as any);
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
    const { accessToken } = await this.authService.login(req.user as any);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    // Frontend reads the token off the query string and stores it,
    // then redirects into the right dashboard based on the JWT's role claim.
    return res.redirect(`${frontendUrl}/oauth/callback?token=${accessToken}`);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }
  
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}