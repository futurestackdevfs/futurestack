import request from 'supertest';
import { Role } from '@prisma/client';
import { PaymentSettingsController } from './payment-settings.controller';
import { PaymentSettingsService } from './payment-settings.service';
import { buildTestApp, authHeaders, TestAppHandle } from '../test-utils/http';

// PaymentSettingsService is fully mocked — no real DB write happens here.
describe('PaymentSettingsController (route-level)', () => {
  let handle: TestAppHandle;
  let paymentSettingsService: Record<string, jest.Mock>;

  beforeEach(async () => {
    paymentSettingsService = {
      getSettings: jest.fn().mockResolvedValue({ gstPercent: 18, usdRate: 84 }),
      getPublicSettings: jest.fn().mockResolvedValue({ usdRate: 84 }),
      updateSettings: jest.fn().mockResolvedValue({ gstPercent: 20 }),
    };
    handle = await buildTestApp({
      controllers: [PaymentSettingsController],
      providers: [{ provide: PaymentSettingsService, useValue: paymentSettingsService }],
    });
  });

  afterEach(() => handle.close());

  describe('GET /admin/payment-settings', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer())
        .get('/admin/payment-settings')
        .expect(401);
    });

    it('returns 403 for a non-ADMIN role', async () => {
      await request(handle.app.getHttpServer())
        .get('/admin/payment-settings')
        .set(authHeaders(Role.COORDINATOR))
        .expect(403);
    });

    it('returns settings for an ADMIN', async () => {
      const res = await request(handle.app.getHttpServer())
        .get('/admin/payment-settings')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .expect(200);

      expect(paymentSettingsService.getSettings).toHaveBeenCalled();
      expect(res.body).toEqual({ gstPercent: 18, usdRate: 84 });
    });
  });

  describe('PATCH /admin/payment-settings', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/payment-settings')
        .send({ gstPercent: 20 })
        .expect(401);
    });

    it('returns 400 for an out-of-range value', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/payment-settings')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .send({ gstPercent: 150 }) // > Max(100)
        .expect(400);
      expect(paymentSettingsService.updateSettings).not.toHaveBeenCalled();
    });

    it('returns 400 for a wrong-typed field', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/payment-settings')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .send({ domesticEnabled: 'yes' }) // should be boolean
        .expect(400);
    });

    it('updates settings for an ADMIN', async () => {
      await request(handle.app.getHttpServer())
        .patch('/admin/payment-settings')
        .set(authHeaders(Role.ADMIN, '__spec__admin-1'))
        .send({ gstPercent: 20 })
        .expect(200);

      expect(paymentSettingsService.updateSettings).toHaveBeenCalledWith({ gstPercent: 20 });
    });
  });

  describe('GET /payment-settings/public', () => {
    it('is publicly accessible with no auth', async () => {
      const res = await request(handle.app.getHttpServer())
        .get('/payment-settings/public')
        .expect(200);

      expect(paymentSettingsService.getPublicSettings).toHaveBeenCalled();
      expect(res.body).toEqual({ usdRate: 84 });
    });
  });
});
