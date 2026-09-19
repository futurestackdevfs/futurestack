import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// Every Prisma call in this file is mocked — no live DB connection is ever
// opened, and MailService/JwtService/ConfigService are mocked too, so no
// real email or token signing infra is touched either.
function makePrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  } as unknown as PrismaService;
}

function makeUser(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: '__spec__user-1',
    email: 'student@example.com',
    name: '__spec__ Student',
    password: '$2b$12$hashedpassword',
    role: Role.STUDENT,
    avatarUrl: null,
    emailVerified: true,
    isActive: true,
    companyId: null,
    googleId: null,
    approvalStatus: null,
    mustChangePassword: false,
    passwordExpiresAt: null,
    passwordChangedAt: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    lastLoginAt: null,
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let jwtService: { sign: jest.Mock };
  let mailService: { sendPasswordResetEmail: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    prisma = makePrismaMock();
    jwtService = { sign: jest.fn().mockReturnValue('__spec__signed.jwt') };
    mailService = { sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined) };
    configService = { get: jest.fn().mockReturnValue('http://localhost:3000') };

    service = new AuthService(
      prisma,
      jwtService as any,
      mailService as any,
      configService as any,
    );
  });

  describe('register()', () => {
    it('creates a new STUDENT account and returns tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(makeUser());
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.register({
        email: 'student@example.com',
        name: '__spec__ Student',
        password: 'Password123',
      } as any);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: Role.STUDENT }),
        }),
      );
      expect(result.accessToken).toBe('__spec__signed.jwt');
      expect(result.rawRefreshToken).toBeTruthy();
    });

    it('rejects registering with an email that already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

      await expect(
        service.register({
          email: 'student@example.com',
          name: '__spec__ Student',
          password: 'Password123',
        } as any),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('registerTrainer()', () => {
    it('creates a PENDING trainer account and does not return an accessToken', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(
        makeUser({ role: Role.TRAINER, approvalStatus: 'PENDING' }),
      );

      const result = await service.registerTrainer({
        email: 'trainer@example.com',
        name: '__spec__ Trainer',
        password: 'Password123',
        bio: 'bio',
        yearsExperience: 3,
      } as any);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: Role.TRAINER,
            approvalStatus: 'PENDING',
          }),
        }),
      );
      expect(result).not.toHaveProperty('accessToken');
      expect(result.message).toMatch(/submitted for review/);
    });
  });

  describe('validateUser()', () => {
    it('returns the safe user on a correct password match', async () => {
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser());

      const result = await service.validateUser('student@example.com', 'correct-password');

      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('password');
    });

    it('returns null on a wrong password', async () => {
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser());

      const result = await service.validateUser('student@example.com', 'wrong-password');
      expect(result).toBeNull();
    });

    it('returns null for an OAuth-only account with no password set', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser({ password: null }));

      const result = await service.validateUser('student@example.com', 'anything');
      expect(result).toBeNull();
    });

    it('rejects a suspended account', async () => {
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser({ isActive: false }));

      await expect(
        service.validateUser('student@example.com', 'correct-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a trainer whose approval is still PENDING', async () => {
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        makeUser({ role: Role.TRAINER, approvalStatus: 'PENDING' }),
      );

      await expect(
        service.validateUser('trainer@example.com', 'correct-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired temporary password', async () => {
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        makeUser({ passwordExpiresAt: new Date('2020-01-01T00:00:00Z') }),
      );

      await expect(
        service.validateUser('student@example.com', 'correct-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens() — rotation with grace window', () => {
    const tokenRow = (overrides: Partial<Record<string, any>> = {}) => ({
      tokenHash: '__spec__hash',
      userId: '__spec__user-1',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(Date.now() - 1000),
      revokedAt: null,
      user: makeUser(),
      ...overrides,
    });

    it('rejects a missing refresh token', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshTokens('raw-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects and cleans up a genuinely expired token', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        tokenRow({ expiresAt: new Date('2020-01-01T00:00:00Z') }),
      );
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});

      await expect(service.refreshTokens('raw-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
    });

    it('rejects a token belonging to a suspended user', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        tokenRow({ user: makeUser({ isActive: false }) }),
      );

      await expect(service.refreshTokens('raw-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a token issued before the last password change', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        tokenRow({
          createdAt: new Date('2026-01-01T00:00:00Z'),
          user: makeUser({ passwordChangedAt: new Date('2026-02-01T00:00:00Z') }),
        }),
      );

      await expect(service.refreshTokens('raw-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates cleanly on first use and issues a fresh token', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(tokenRow());
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.refreshTokens('raw-token');

      expect(result.accessToken).toBe('__spec__signed.jwt');
      expect(result.newRawRefreshToken).toBeTruthy();
    });

    it('treats a concurrent refresh (revoked <60s ago) as legitimate, not a replay', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        tokenRow({ revokedAt: new Date(Date.now() - 5_000) }),
      );
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.refreshTokens('raw-token');
      expect(result.accessToken).toBe('__spec__signed.jwt');
    });

    it('rejects a genuine replay — token revoked more than 60s ago', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        tokenRow({ revokedAt: new Date(Date.now() - 120_000) }),
      );
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(service.refreshTokens('raw-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout()', () => {
    it('revokes all refresh tokens for the user when userId is known', async () => {
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      await service.logout('raw-token', '__spec__user-1');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: '__spec__user-1' },
      });
    });

    it('falls back to deleting by token hash when no userId is given', async () => {
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.logout('raw-token');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
      });
    });
  });

  describe('setPassword()', () => {
    it('rejects a password shorter than 8 characters', async () => {
      await expect(service.setPassword('__spec__user-1', 'short')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('hashes and stores a valid new password, clearing mustChangePassword', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await service.setPassword('__spec__user-1', 'LongEnoughPassword1');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '__spec__user-1' },
          data: expect.objectContaining({ mustChangePassword: false }),
        }),
      );
    });
  });

  describe('forgotPassword()', () => {
    it('returns the generic message and sends no email when the account does not exist', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@example.com');

      expect(result.message).toMatch(/If an account/);
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('returns the same generic message for an OAuth-only account (no enumeration leak)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser({ password: null }));

      const result = await service.forgotPassword('student@example.com');

      expect(result.message).toMatch(/If an account/);
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('stores a hashed reset token and sends the reset email for a real account', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser());
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.forgotPassword('student@example.com');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordResetToken: expect.any(String),
            passwordResetExpires: expect.any(Date),
          }),
        }),
      );
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(result.message).toMatch(/If an account/);
    });
  });

  describe('resetPassword()', () => {
    it('rejects an invalid or expired reset token', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resetPassword('bad-token', 'NewPassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets a new password and clears the reset token fields, invalidating existing sessions', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(makeUser());
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.resetPassword('good-token', 'NewPassword123');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordResetToken: null,
            passwordChangedAt: expect.any(Date),
          }),
        }),
      );
      expect(result.message).toMatch(/reset successfully/);
    });
  });

  describe('login()', () => {
    it('updates lastLoginAt and returns access + refresh tokens', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const safeUser = { ...makeUser() };
      delete (safeUser as any).password;

      const result = await service.login(safeUser as any);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        }),
      );
      expect(result.accessToken).toBe('__spec__signed.jwt');
      expect(result.rawRefreshToken).toBeTruthy();
    });
  });
});
