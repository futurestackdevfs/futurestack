import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { GoogleAuthGuard } from './guards/google-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /auth/register
  @Post('register')
  async register(@Body() body: {
    name: string
    email: string
    password: string
  }) {
    return this.authService.register(body)
  }

  // POST /auth/login
  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Request() req: any) {
    return this.authService.login(req.user)
  }

  // GET /auth/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: any) {
    return req.user
  }

  // GET /auth/google
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  // GET /auth/google/callback
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Request() req: any, @Res() res: any) {
    const result = await this.authService.googleAuth(req.user)
    // redirect to frontend with token
    res.redirect(
      `http://localhost:3000/auth/callback?token=${result.accessToken}&role=${result.user.role}`
    )
  }
}