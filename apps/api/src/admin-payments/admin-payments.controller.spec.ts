import request from 'supertest';
import { Role } from '@prisma/client';
import { AdminPaymentsController } from './admin-payments.controller';
import { AdminPaymentsService } from './admin-payments.service';
import { buildTestApp, authHeaders, TestAppHandle } from '../test-utils/http';

// AdminPaymentsService is fully mocked — no real DB read happens here.
describe('AdminPaymentsController (route-level)', () => {
  let handle: TestAppHandle;
  let adminPaymentsService: Record<string, jest.Mock>;

  beforeEach(async () => {
    adminPaymentsService = {
      listPayments: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      trainerBreakdown: jest.fn().mockResolvedValue([]),
    };
    handle = await buildTestApp({
      controllers: [AdminPaymentsController],
      providers: [{ provide: AdminPaymentsService, useValue: adminPaymentsService }],
    });
  });

  afterEach(() => handle.close());

  describe.each([
    ['GET /admin/payments', '/admin/payments'],
    ['GET /admin/payments/trainers', '/admin/payments/trainers'],
  ])('%s — shared ADMIN/COORDINATOR auth', (_name, path) => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer()).get(path).expect(401);
    });

    it('returns 403 for a role that is neither ADMIN nor COORDINATOR', async () => {
      await request(handle.app.getHttpServer())
        .get(path)
        .set(authHeaders(Role.STUDENT))
        .expect(403);
    });

    it('allows COORDINATOR through', async () => {
      await request(handle.app.getHttpServer())
        .get(path)
        .set(authHeaders(Role.COORDINATOR))
        .expect(200);
    });
  });

  it('GET /admin/payments forwards query params to the service', async () => {
    await request(handle.app.getHttpServer())
      .get('/admin/payments?status=SUCCESS&page=3&perPage=15')
      .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
      .expect(200);

    expect(adminPaymentsService.listPayments).toHaveBeenCalledWith('SUCCESS', 3, 15);
  });

  it('GET /admin/payments/trainers returns the trainer breakdown', async () => {
    await request(handle.app.getHttpServer())
      .get('/admin/payments/trainers')
      .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
      .expect(200);

    expect(adminPaymentsService.trainerBreakdown).toHaveBeenCalled();
  });
});
