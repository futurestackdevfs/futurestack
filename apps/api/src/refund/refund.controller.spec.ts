import request from 'supertest';
import { Role } from '@prisma/client';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { buildTestApp, authHeaders, TestAppHandle } from '../test-utils/http';

// Issuing / approving / rejecting is ADMIN-only; SUPPORT can raise a request, cancel it, and read status. RefundService is a fully mocked provider —
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
      requestRefund: jest.fn().mockResolvedValue({ id: '__spec__refund-2', status: 'PENDING' }),
      cancelRefund: jest.fn().mockResolvedValue({ id: '__spec__refund-2', status: 'CANCELLED' }),
      approveRefund: jest.fn().mockResolvedValue({ id: '__spec__refund-2', status: 'PROCESSED' }),
      refundOptions: jest.fn().mockResolvedValue({ orders: [] }),
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

    it('returns 403 for a non-ADMIN role - support has to go through a request', async () => {
      for (const role of [Role.SUPPORT, Role.STUDENT, Role.SALES]) {
        await request(handle.app.getHttpServer())
          .post('/admin/refunds')
          .set(authHeaders(role))
          .send(validBody)
          .expect(403);
      }
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

      expect(refundService.listRefunds).toHaveBeenCalledWith('PENDING', 2, 5, undefined, undefined);
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

      expect(refundService.rejectRefund).toHaveBeenCalledWith('__spec__refund-1', '__spec__admin-1', undefined);
    });
  });

  describe('support-desk flow', () => {
    const body = { orderId: '__spec__order-1', courseId: '__spec__course-1', reason: 'Student could not access videos', ticketId: '__spec__ticket-1' };

    it('lets SUPPORT raise a refund request (passes the actor through)', async () => {
      await request(handle.app.getHttpServer())
        .post('/admin/refunds/request')
        .set(authHeaders(Role.SUPPORT, '__spec__support-1'))
        .send(body)
        .expect(201);
      expect(refundService.requestRefund).toHaveBeenCalledWith(
        expect.objectContaining(body),
        expect.objectContaining({ id: '__spec__support-1', role: Role.SUPPORT }),
      );
    });

    it('blocks roles other than SUPPORT/ADMIN from requesting or cancelling', async () => {
      for (const role of [Role.STUDENT, Role.SALES, Role.TRAINER]) {
        await request(handle.app.getHttpServer())
          .post('/admin/refunds/request')
          .set(authHeaders(role))
          .send(body)
          .expect(403);
        await request(handle.app.getHttpServer())
          .patch('/admin/refunds/__spec__refund-2/cancel')
          .set(authHeaders(role))
          .expect(403);
      }
      expect(refundService.requestRefund).not.toHaveBeenCalled();
      expect(refundService.cancelRefund).not.toHaveBeenCalled();
    });

    it('rejects a request without a reason', async () => {
      await request(handle.app.getHttpServer())
        .post('/admin/refunds/request')
        .set(authHeaders(Role.SUPPORT, '__spec__support-1'))
        .send({ orderId: '__spec__order-1', courseId: '__spec__course-1' })
        .expect(400);
    });

    it('lets SUPPORT cancel a pending request', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/refunds/__spec__refund-2/cancel')
        .set(authHeaders(Role.SUPPORT, '__spec__support-1'))
        .expect(200);
      expect(refundService.cancelRefund).toHaveBeenCalledWith(
        '__spec__refund-2',
        expect.objectContaining({ id: '__spec__support-1' }),
      );
    });

    it('lets SUPPORT read the list and the refund options', async () => {
      await request(handle.app.getHttpServer())
        .get('/admin/refunds?ticketId=__spec__ticket-1')
        .set(authHeaders(Role.SUPPORT, '__spec__support-1'))
        .expect(200);
      expect(refundService.listRefunds).toHaveBeenCalledWith(undefined, 1, 10, '__spec__ticket-1', undefined);
      await request(handle.app.getHttpServer())
        .get('/admin/refunds/options?studentId=__spec__student-1')
        .set(authHeaders(Role.SUPPORT, '__spec__support-1'))
        .expect(200);
      expect(refundService.refundOptions).toHaveBeenCalledWith('__spec__student-1');
    });

    it('?mine=true limits the list to the logged-in agent', async () => {
      await request(handle.app.getHttpServer())
        .get('/admin/refunds?mine=true&status=PENDING')
        .set(authHeaders(Role.SUPPORT, '__spec__support-1'))
        .expect(200);
      expect(refundService.listRefunds).toHaveBeenLastCalledWith('PENDING', 1, 10, undefined, '__spec__support-1');
    });

    it('only an ADMIN can approve - SUPPORT gets 403', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/refunds/__spec__refund-2/approve')
        .set(authHeaders(Role.SUPPORT, '__spec__support-1'))
        .expect(403);
      expect(refundService.approveRefund).not.toHaveBeenCalled();

      await request(handle.app.getHttpServer())
        .patch('/admin/refunds/__spec__refund-2/approve')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .expect(200);
      expect(refundService.approveRefund).toHaveBeenCalledWith('__spec__refund-2', '__spec__admin-1');
    });
  });
});
