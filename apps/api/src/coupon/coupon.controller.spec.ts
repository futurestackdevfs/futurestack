import request from 'supertest';
import { Role, DiscountType } from '@prisma/client';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { buildTestApp, authHeaders, TestAppHandle } from '../test-utils/http';

// All routes here are ADMIN-only. CouponService is a fully mocked provider —
// no real DB write happens in this file.
describe('CouponController (route-level)', () => {
  let handle: TestAppHandle;
  let couponService: Record<string, jest.Mock>;

  const validCreateBody = {
    code: 'LAUNCH25',
    discountType: DiscountType.PERCENT,
    value: 25,
  };

  beforeEach(async () => {
    couponService = {
      create: jest.fn().mockResolvedValue({ id: '__spec__coupon-1', code: 'LAUNCH25' }),
      list: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      listSales: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: '__spec__coupon-1' }),
      update: jest.fn().mockResolvedValue({ id: '__spec__coupon-1' }),
      deactivate: jest.fn().mockResolvedValue({ id: '__spec__coupon-1', isActive: false }),
      remove: jest.fn().mockResolvedValue({ message: 'Coupon deleted' }),
    };
    handle = await buildTestApp({
      controllers: [CouponController],
      providers: [{ provide: CouponService, useValue: couponService }],
    });
  });

  afterEach(() => handle.close());

  describe('POST /admin/coupons', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer())
        .post('/admin/coupons')
        .send(validCreateBody)
        .expect(401);
    });

    it('returns 403 for a non-ADMIN role', async () => {
      await request(handle.app.getHttpServer())
        .post('/admin/coupons')
        .set(authHeaders(Role.SALES))
        .send(validCreateBody)
        .expect(403);
      expect(couponService.create).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid discountType enum value', async () => {
      await request(handle.app.getHttpServer())
        .post('/admin/coupons')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .send({ code: 'ABC123', discountType: 'NOT_A_REAL_TYPE', value: 10 })
        .expect(400);
    });

    it('returns 400 when code contains characters outside the allowed pattern', async () => {
      await request(handle.app.getHttpServer())
        .post('/admin/coupons')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .send({ code: 'bad code!', discountType: DiscountType.PERCENT, value: 10 })
        .expect(400);
    });

    it('creates the coupon for an ADMIN', async () => {
      await request(handle.app.getHttpServer())
        .post('/admin/coupons')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .send(validCreateBody)
        .expect(201);

      expect(couponService.create).toHaveBeenCalledWith(
        '__spec__admin-1',
        expect.objectContaining({ code: 'LAUNCH25' }),
      );
    });
  });

  describe('GET /admin/coupons', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer()).get('/admin/coupons').expect(401);
    });

    it('lists coupons for an ADMIN with clamped page size', async () => {
      await request(handle.app.getHttpServer())
        .get('/admin/coupons?page=2&perPage=20')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .expect(200);

      expect(couponService.list).toHaveBeenCalledWith(2, 20);
    });
  });

  describe('GET /admin/coupons/:id/sales', () => {
    it('returns 403 for a non-ADMIN role', async () => {
      await request(handle.app.getHttpServer())
        .get('/admin/coupons/__spec__coupon-1/sales')
        .set(authHeaders(Role.TRAINER))
        .expect(403);
    });

    it('returns sales data for an ADMIN', async () => {
      await request(handle.app.getHttpServer())
        .get('/admin/coupons/__spec__coupon-1/sales')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .expect(200);

      expect(couponService.listSales).toHaveBeenCalledWith('__spec__coupon-1');
    });
  });

  describe('GET /admin/coupons/:id', () => {
    it('returns the coupon for an ADMIN', async () => {
      await request(handle.app.getHttpServer())
        .get('/admin/coupons/__spec__coupon-1')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .expect(200);

      expect(couponService.findOne).toHaveBeenCalledWith('__spec__coupon-1');
    });
  });

  describe('PATCH /admin/coupons/:id', () => {
    it('returns 400 for an invalid partial body (bad enum)', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/coupons/__spec__coupon-1')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .send({ discountType: 'GARBAGE' })
        .expect(400);
    });

    it('updates the coupon for an ADMIN', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/coupons/__spec__coupon-1')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .send({ value: 30 })
        .expect(200);

      expect(couponService.update).toHaveBeenCalledWith('__spec__coupon-1', { value: 30 });
    });
  });

  describe('PATCH /admin/coupons/:id/deactivate', () => {
    it('returns 403 for a non-ADMIN role', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/coupons/__spec__coupon-1/deactivate')
        .set(authHeaders(Role.CONTENT_MANAGER))
        .expect(403);
    });

    it('deactivates the coupon for an ADMIN', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/coupons/__spec__coupon-1/deactivate')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .expect(200);

      expect(couponService.deactivate).toHaveBeenCalledWith('__spec__coupon-1');
    });
  });

  describe('DELETE /admin/coupons/:id', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer())
        .delete('/admin/coupons/__spec__coupon-1')
        .expect(401);
    });

    it('deletes the coupon for an ADMIN', async () => {
      await request(handle.app.getHttpServer())
        .delete('/admin/coupons/__spec__coupon-1')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .expect(200);

      expect(couponService.remove).toHaveBeenCalledWith('__spec__coupon-1');
    });
  });
});
