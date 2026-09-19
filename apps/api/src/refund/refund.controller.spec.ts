import request from 'supertest';
import { Role } from '@prisma/client';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { buildTestApp, authHeaders, TestAppHandle } from '../test-utils/http';

// All routes here are ADMIN-only. RefundService is a fully mocked provider —
// no real DB write or refund gateway call happens in this file.
describe('RefundController (route-level)', () => {
  let handle: TestAppHandle;
  let refundService: Record<string, jest.Mock>;

  beforeEach(async () => {
    refundService = {
      createRefund: jest.fn().mockResolvedValue({ id: '__spec__refund-1' }),
      listRefunds: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getRefund: jest.fn().mockResolvedValue({ id: '__spec__refund-1' }),
      rejectRefund: jest.fn().mockResolvedValue({ id: '__spec__refund-1', status: 'REJECTED' }),
    };
    handle = await buildTestApp({
      controllers: [RefundController],
      providers: [{ provide: RefundService, useValue: refundService }],
    });
  });

  afterEach(() => handle.close());

  describe('POST /admin/refunds', () => {
    const validBody = {
      orderId: '__spec__order-1',
      amount: 500,
      reason: 'Duplicate charge',
    };

    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer())
        .post('/admin/refunds')
        .send(validBody)
        .expect(401);
    });

    it('returns 403 for a non-ADMIN role', async () => {
      await request(handle.app.getHttpServer())
        .post('/admin/refunds')
        .set(authHeaders(Role.SUPPORT))
        .send(validBody)
        .expect(403);
      expect(refundService.createRefund).not.toHaveBeenCalled();
    });

    it('returns 400 for a body missing required fields', async () => {
      await request(handle.app.getHttpServer())
        .post('/admin/refunds')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .send({ orderId: '__spec__order-1' }) // missing amount + reason
        .expect(400);
    });

    it('creates the refund for an ADMIN', async () => {
      await request(handle.app.getHttpServer())
        .post('/admin/refunds')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .send(validBody)
        .expect(201);

      expect(refundService.createRefund).toHaveBeenCalledWith(
        expect.objectContaining(validBody),
        '__spec__admin-1',
      );
    });
  });

  describe('GET /admin/refunds', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer()).get('/admin/refunds').expect(401);
    });

    it('returns 403 for a non-ADMIN role', async () => {
      await request(handle.app.getHttpServer())
        .get('/admin/refunds')
        .set(authHeaders(Role.COORDINATOR))
        .expect(403);
    });

    it('lists refunds for an ADMIN', async () => {
      const res = await request(handle.app.getHttpServer())
        .get('/admin/refunds?status=PENDING&page=2&perPage=5')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .expect(200);

      expect(refundService.listRefunds).toHaveBeenCalledWith('PENDING', 2, 5);
      expect(res.body).toEqual({ data: [], total: 0 });
    });
  });

  describe('GET /admin/refunds/:id', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer())
        .get('/admin/refunds/__spec__refund-1')
        .expect(401);
    });

    it('returns the refund for an ADMIN', async () => {
      await request(handle.app.getHttpServer())
        .get('/admin/refunds/__spec__refund-1')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .expect(200);

      expect(refundService.getRefund).toHaveBeenCalledWith('__spec__refund-1');
    });
  });

  describe('PATCH /admin/refunds/:id/reject', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/refunds/__spec__refund-1/reject')
        .expect(401);
    });

    it('returns 403 for a non-ADMIN role', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/refunds/__spec__refund-1/reject')
        .set(authHeaders(Role.SALES))
        .expect(403);
    });

    it('rejects the refund for an ADMIN', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/refunds/__spec__refund-1/reject')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .expect(200);

      expect(refundService.rejectRefund).toHaveBeenCalledWith('__spec__refund-1');
    });
  });
});
