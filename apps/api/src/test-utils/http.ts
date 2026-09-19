import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Shared route-level (controller) test helper.
 *
 * These tests compile a *standalone* Nest module — only the controller(s)
 * under test plus fully mocked providers — then spin up a real, in-memory
 * Nest HTTP pipeline (guards, the same global ValidationPipe as production,
 * real controller routing) and drive it with supertest. Nothing here ever
 * opens a real database connection or makes a real external network call:
 * every Prisma/Razorpay/Mail/etc. dependency passed in `providers` is a
 * jest.fn()-based mock, matching the existing service-level spec convention.
 *
 * Auth simulation: JwtAuthGuard (which normally verifies a real JWT via
 * passport-jwt) is overridden with a fake guard that reads two plain test
 * headers instead of parsing a token:
 *   x-test-user-id   → becomes req.user.id
 *   x-test-user-role → becomes req.user.role
 * With neither header present, the fake guard behaves like the real one for
 * an unauthenticated request and throws (401). This lets each spec exercise
 * the REAL RolesGuard (imported unmodified) for the 403 "wrong role" case,
 * and the real route handler for the "correct role" case — only the JWT
 * verification step itself is faked out, since there is no real login flow
 * to produce a real signed token in this fully-mocked environment.
 */
class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const id = req.headers['x-test-user-id'];
    const role = req.headers['x-test-user-role'];
    if (!id || !role) {
      throw new (require('@nestjs/common').UnauthorizedException)(
        'No auth token provided',
      );
    }
    req.user = { id, role };
    return true;
  }
}

export interface TestAppHandle {
  app: INestApplication;
  close(): Promise<void>;
}

export async function buildTestApp(opts: {
  controllers: any[];
  providers: any[];
}): Promise<TestAppHandle> {
  const moduleRef = await Test.createTestingModule({
    controllers: opts.controllers,
    providers: opts.providers,
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(new FakeJwtAuthGuard())
    .compile();

  // rawBody: true mirrors main.ts — needed by WebhookController's raw-body
  // signature verification. Harmless for every other controller.
  const app = moduleRef.createNestApplication({ rawBody: true } as any);
  // Same global pipe as production main.ts, so 400-on-invalid-DTO behavior
  // in these tests matches what really runs in prod.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  await app.init();

  return {
    app,
    close: () => app.close(),
  };
}

/** Headers that satisfy FakeJwtAuthGuard as the given user id + role. */
export function authHeaders(role: Role, id = `__spec__${role.toLowerCase()}-1`) {
  return { 'x-test-user-id': id, 'x-test-user-role': role };
}
