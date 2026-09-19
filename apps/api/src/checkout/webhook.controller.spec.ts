import request from 'supertest';
import { WebhookController } from './webhook.controller';
import { RazorpayClientService } from './razorpay-client.service';
import { CheckoutService } from './checkout.service';
import { buildTestApp, TestAppHandle } from '../test-utils/http';

// This route is deliberately public (no @Auth — Razorpay can't present a
// user JWT) and instead relies on HMAC signature verification. It is the
// highest-risk unauthenticated route in the API, so this spec focuses on
// proving the signature gate actually blocks unsigned/forged requests.
// RazorpayClientService and CheckoutService are fully mocked — no real
// Razorpay call or DB write happens here.
describe('WebhookController (route-level)', () => {
  let handle: TestAppHandle;
  let razorpayClient: { validateWebhookSignature: jest.Mock };
  let checkoutService: { handleWebhookEvent: jest.Mock };

  beforeEach(async () => {
    razorpayClient = { validateWebhookSignature: jest.fn() };
    checkoutService = { handleWebhookEvent: jest.fn().mockResolvedValue(undefined) };
    handle = await buildTestApp({
      controllers: [WebhookController],
      providers: [
        { provide: RazorpayClientService, useValue: razorpayClient },
        { provide: CheckoutService, useValue: checkoutService },
      ],
    });
  });

  afterEach(() => handle.close());

  it('rejects a request with no x-razorpay-signature header (401)', async () => {
    await request(handle.app.getHttpServer())
      .post('/webhooks/razorpay')
      .send({ event: 'payment.captured' })
      .expect(401);

    expect(razorpayClient.validateWebhookSignature).not.toHaveBeenCalled();
    expect(checkoutService.handleWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects a request whose signature fails verification (401)', async () => {
    razorpayClient.validateWebhookSignature.mockReturnValue(false);

    await request(handle.app.getHttpServer())
      .post('/webhooks/razorpay')
      .set('x-razorpay-signature', 'forged-signature')
      .send({ event: 'payment.captured' })
      .expect(401);

    expect(checkoutService.handleWebhookEvent).not.toHaveBeenCalled();
  });

  it('accepts and processes a request with a valid signature', async () => {
    razorpayClient.validateWebhookSignature.mockReturnValue(true);

    const res = await request(handle.app.getHttpServer())
      .post('/webhooks/razorpay')
      .set('x-razorpay-signature', 'valid-signature')
      .send({ event: 'payment.captured', payload: {} })
      .expect(201);

    expect(checkoutService.handleWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'payment.captured' }),
    );
    expect(res.body).toEqual({ received: true });
  });
});
