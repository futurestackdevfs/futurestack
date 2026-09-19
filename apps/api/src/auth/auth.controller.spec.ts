import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { buildTestApp, authHeaders, TestAppHandle } from '../test-utils/http';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Route-level tests for the auth surface. LocalAuthGuard / GoogleAuthGuard
// (which normally run passport-local / passport-google strategies against
// real credentials) are overridden here exactly like JwtAuthGuard is in the
// shared test-utils/http.ts helper — this file builds its own app because it
// needs those two extra guard overrides that other controllers don't use.
// AuthService is a fully mocked jest.fn() provider; no real bcrypt-hashed
// login, DB row or JWT signing infra is touched.
describe('AuthController (route-level)', () => {
  let handle: TestAppHandle;
  let authService: Record<string, jest.Mock>;
  let localGuardResult: { user: any } | null;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      registerTrainer: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      setPassword: jest.fn(),
    };
    localGuardResult = null;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          const id = req.headers['x-test-user-id'];
          const role = req.headers['x-test-user-role'];
          if (!id || !role) {
            throw new (require('@nestjs/common').UnauthorizedException)();
          }
          req.user = { id, role };
          return true;
        },
      })
      .overrideGuard(LocalAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          if (!localGuardResult) {
            throw new (require('@nestjs/common').UnauthorizedException)(
              'Invalid credentials',
            );
          }
          const req = ctx.switchToHttp().getRequest();
          req.user = localGuardResult.user;
          return true;
        },
      })
      .overrideGuard(GoogleAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    const app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    const cookieParser = require('cookie-parser');
    app.use(cookieParser());
    await app.init();

    handle = { app, close: () => app.close() };
  });

  afterEach(() => handle.close());

  describe('POST /auth/register', () => {
    it('returns 400 for an invalid body (bad email, short password)', async () => {
      await request(handle.app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', name: 'A', password: 'short' })
        .expect(400);
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('creates a student account and sets the refresh-token cookie', async () => {
      authService.register.mockResolvedValue({
        accessToken: '__spec__access.jwt',
        rawRefreshToken: '__spec__raw-refresh',
        user: { email: 'student@example.com', name: '__spec__ Student', role: Role.STUDENT },
      });

      const res = await request(handle.app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'student@example.com', name: '__spec__ Student', password: 'Password123' })
        .expect(201);

      expect(authService.register).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'student@example.com' }),
      );
      expect(res.body.accessToken).toBe('__spec__access.jwt');
      expect(res.headers['set-cookie']?.[0]).toMatch(/fs_student_refresh=/);
    });
  });

  describe('POST /auth/register-trainer', () => {
    it('returns 400 for a missing required field', async () => {
      await request(handle.app.getHttpServer())
        .post('/auth/register-trainer')
        .send({ email: 'trainer@example.com' })
        .expect(400);
    });

    it('registers a pending trainer account', async () => {
      authService.registerTrainer.mockResolvedValue({ message: 'submitted for review' });

      await request(handle.app.getHttpServer())
        .post('/auth/register-trainer')
        .send({
          email: 'trainer@example.com',
          name: '__spec__ Trainer',
          password: 'Password123',
        })
        .expect(201);

      expect(authService.registerTrainer).toHaveBeenCalled();
    });
  });

  describe('POST /auth/login', () => {
    it('returns 401 when LocalAuthGuard rejects the credentials', async () => {
      // localGuardResult stays null → guard throws, matching a real bad-password attempt
      await request(handle.app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'student@example.com', password: 'wrong' })
        .expect(401);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid body shape (once past LocalAuthGuard)', async () => {
      // LocalAuthGuard runs before the ValidationPipe in Nest's pipeline, so
      // this only exercises DTO validation when the guard itself would pass.
      localGuardResult = {
        user: { id: '__spec__student-1', role: Role.STUDENT, email: 'student@example.com' },
      };

      await request(handle.app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('logs in a verified student and sets the student refresh cookie', async () => {
      localGuardResult = {
        user: { id: '__spec__student-1', role: Role.STUDENT, email: 'student@example.com' },
      };
      authService.login.mockResolvedValue({
        accessToken: '__spec__access.jwt',
        rawRefreshToken: '__spec__raw-refresh',
        user: { id: '__spec__student-1', role: Role.STUDENT },
      });

      const res = await request(handle.app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'student@example.com', password: 'correct-password' })
        .expect(201);

      expect(res.body.accessToken).toBe('__spec__access.jwt');
      expect(res.headers['set-cookie']?.[0]).toMatch(/fs_student_refresh=/);
    });

    it('rejects a STUDENT credential set through portal=ops (cross-portal login block)', async () => {
      localGuardResult = {
        user: { id: '__spec__student-1', role: Role.STUDENT, email: 'student@example.com' },
      };

      await request(handle.app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'student@example.com', password: 'correct-password', portal: 'ops' })
        .expect(401);
      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('returns the authenticated principal', async () => {
      const res = await request(handle.app.getHttpServer())
        .get('/auth/me')
        .set(authHeaders(Role.STUDENT, '__spec__student-1'))
        .expect(200);
      expect(res.body).toEqual({ id: '__spec__student-1', role: Role.STUDENT });
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 401 with no refresh-token cookie present', async () => {
      await request(handle.app.getHttpServer()).post('/auth/refresh').expect(401);
      expect(authService.refreshTokens).not.toHaveBeenCalled();
    });

    it('rotates the token when a valid refresh cookie is present', async () => {
      authService.refreshTokens.mockResolvedValue({
        accessToken: '__spec__new-access.jwt',
        newRawRefreshToken: '__spec__new-raw-refresh',
        user: { id: '__spec__student-1', role: Role.STUDENT },
      });

      const res = await request(handle.app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'fs_student_refresh=__spec__raw-refresh')
        .expect(201);

      expect(authService.refreshTokens).toHaveBeenCalledWith('__spec__raw-refresh');
      expect(res.body.accessToken).toBe('__spec__new-access.jwt');
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('logs out an authenticated user and clears their cookie', async () => {
      authService.logout.mockResolvedValue(undefined);

      const res = await request(handle.app.getHttpServer())
        .post('/auth/logout')
        .set(authHeaders(Role.STUDENT, '__spec__student-1'))
        .expect(201);

      expect(authService.logout).toHaveBeenCalledWith('', '__spec__student-1');
      expect(res.body.message).toMatch(/Logged out/);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('returns 400 for an invalid email', async () => {
      await request(handle.app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('accepts a well-formed email regardless of whether the account exists', async () => {
      authService.forgotPassword.mockResolvedValue({ message: 'If an account exists...' });

      await request(handle.app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'anyone@example.com' })
        .expect(201);

      expect(authService.forgotPassword).toHaveBeenCalledWith('anyone@example.com');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('returns 400 for a too-short new password', async () => {
      await request(handle.app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'abc', newPassword: 'short' })
        .expect(400);
    });

    it('resets the password given a valid token payload', async () => {
      authService.resetPassword.mockResolvedValue({ message: 'Password has been reset successfully' });

      await request(handle.app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'good-token', newPassword: 'NewPassword123' })
        .expect(201);

      expect(authService.resetPassword).toHaveBeenCalledWith('good-token', 'NewPassword123');
    });
  });

  describe('POST /auth/set-password', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer())
        .post('/auth/set-password')
        .send({ newPassword: 'NewPassword123' })
        .expect(401);
    });

    it('returns 400 for a too-short new password', async () => {
      await request(handle.app.getHttpServer())
        .post('/auth/set-password')
        .set(authHeaders(Role.TRAINER, '__spec__trainer-1'))
        .send({ newPassword: 'short' })
        .expect(400);
    });

    it('sets the password for the authenticated user', async () => {
      authService.setPassword.mockResolvedValue({ message: 'Password has been set successfully' });

      await request(handle.app.getHttpServer())
        .post('/auth/set-password')
        .set(authHeaders(Role.TRAINER, '__spec__trainer-1'))
        .send({ newPassword: 'NewPassword123' })
        .expect(201);

      expect(authService.setPassword).toHaveBeenCalledWith('__spec__trainer-1', 'NewPassword123');
    });
  });
});
