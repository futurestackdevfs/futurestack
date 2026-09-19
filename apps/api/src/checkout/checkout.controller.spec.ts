import request from 'supertest';
import { Role } from '@prisma/client';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { buildTestApp, authHeaders, TestAppHandle } from '../test-utils/http';

// Route-level tests: real Nest HTTP pipeline (guards, global ValidationPipe,
// real controller routing) driven via supertest against an in-memory app
// instance — no real network exposure and no real DB. CheckoutService is a
// plain jest.fn() mock; nothing here ever calls Razorpay or Prisma for real.
describe('CheckoutController (route-level)', () => {
  let handle: TestAppHandle;
  let checkoutService: Record<string, jest.Mock>;

  const validOrderBody = {
    currency: 'INR',
    fullName: '__spec__ Student',
    email: 'student@example.com',
    phone: '9999999999',
    address: '123 Main St',
    city: 'Pune',
    state: 'MH',
    pincode: '411001',
  };

  beforeEach(async () => {
    checkoutService = {
      createOrder: jest.fn().mockResolvedValue({ orderId: '__spec__order-1' }),
      verifyPayment: jest.fn().mockResolvedValue({ success: true }),
      cancelOrder: jest.fn().mockResolvedValue({ message: 'Order cancelled' }),
    };
    handle = await buildTestApp({
      controllers: [CheckoutController],
      providers: [{ provide: CheckoutService, useValue: checkoutService }],
    });
  });

  afterEach(() => handle.close());

  describe('POST /checkout/create-order', () => {
    it('returns 401 with no Authorization/test-user header', async () => {
      await request(handle.app.getHttpServer())
        .post('/checkout/create-order')
        .send(validOrderBody)
        .expect(401);
      expect(checkoutService.createOrder).not.toHaveBeenCalled();
    });

    it('returns 403 for a non-STUDENT role (e.g. ADMIN)', async () => {
      await request(handle.app.getHttpServer())
        .post('/checkout/create-order')
        .set(authHeaders(Role.ADMIN))
        .send(validOrderBody)
        .expect(403);
      expect(checkoutService.createOrder).not.toHaveBeenCalled();
    });

    it('returns 400 from the global ValidationPipe for an invalid body', async () => {
      await request(handle.app.getHttpServer())
        .post('/checkout/create-order')
        .set(authHeaders(Role.STUDENT, '__spec__student-1'))
        .send({ currency: 'INR' }) // missing every other required field
        .expect(400);
      expect(checkoutService.createOrder).not.toHaveBeenCalled();
    });

    it('reaches the handler and calls the service for a valid STUDENT request', async () => {
      const res = await request(handle.app.getHttpServer())
        .post('/checkout/create-order')
        .set(authHeaders(Role.STUDENT, '__spec__student-1'))
        .send(validOrderBody)
        .expect(201);

      expect(checkoutService.createOrder).toHaveBeenCalledWith(
        '__spec__student-1',
        expect.objectContaining({ email: 'student@example.com' }),
      );
      expect(res.body).toEqual({ orderId: '__spec__order-1' });
    });
  });

  describe('POST /checkout/verify', () => {
    const validVerifyBody = {
      razorpay_order_id: 'order_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig_1',
    };

    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer())
        .post('/checkout/verify')
        .send(validVerifyBody)
        .expect(401);
    });

    it('returns 400 for a body missing required fields', async () => {
      await request(handle.app.getHttpServer())
        .post('/checkout/verify')
        .set(authHeaders(Role.STUDENT, '__spec__student-1'))
        .send({ razorpay_order_id: 'order_1' })
        .expect(400);
    });

    it('reaches the handler for a valid STUDENT request', async () => {
      await request(handle.app.getHttpServer())
        .post('/checkout/verify')
        .set(authHeaders(Role.STUDENT, '__spec__student-1'))
        .send(validVerifyBody)
        .expect(201);

      expect(checkoutService.verifyPayment).toHaveBeenCalledWith(
        '__spec__student-1',
        validVerifyBody,
      );
    });
  });

  describe('POST /checkout/cancel', () => {
    it('returns 401 with no auth', async () => {
      await request(handle.app.getHttpServer())
        .post('/checkout/cancel')
        .send({ razorpayOrderId: 'order_1' })
        .expect(401);
    });

    it('returns 400 for an empty body', async () => {
      await request(handle.app.getHttpServer())
        .post('/checkout/cancel')
        .set(authHeaders(Role.STUDENT, '__spec__student-1'))
        .send({})
        .expect(400);
    });

    it('reaches the handler and forwards the razorpayOrderId', async () => {
      await request(handle.app.getHttpServer())
        .post('/checkout/cancel')
        .set(authHeaders(Role.STUDENT, '__spec__student-1'))
        .send({ razorpayOrderId: 'order_1' })
        .expect(201);

      expect(checkoutService.cancelOrder).toHaveBeenCalledWith(
        '__spec__student-1',
        'order_1',
      );
    });
  });
});
