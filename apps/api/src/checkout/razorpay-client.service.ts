import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';

/**
 * Single Razorpay SDK instance for the whole app.
 *
 * We operate one Razorpay account — one Key Id / Key Secret pair. International
 * payments will be activated later on the SAME account, so there is deliberately
 * no per-currency client split and no RAZORPAY_DOMESTIC_* / RAZORPAY_INTL_* keys.
 *
 * Credentials are required at startup: if RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
 * are missing the app fails fast at boot rather than degrading on every checkout
 * request — a misconfigured store should never become a silent 503 at the till.
 */
@Injectable()
export class RazorpayClientService implements OnModuleInit {
  private client!: Razorpay;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new Error(
        'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing — set them in .env before starting the app',
      );
    }
    this.client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  getClient(): Razorpay {
    return this.client;
  }

  getKeyId(): string {
    return this.config.get<string>('RAZORPAY_KEY_ID') as string;
  }

  getKeySecret(): string {
    return this.config.get<string>('RAZORPAY_KEY_SECRET') as string;
  }

  getWebhookSecret(): string {
    return this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') as string;
  }

  /** Verifies a webhook signature against RAZORPAY_WEBHOOK_SECRET. */
  validateWebhookSignature(body: Buffer | string, signature: string): boolean {
    return Razorpay.validateWebhookSignature(
      body.toString(),
      signature,
      this.getWebhookSecret(),
    );
  }
}
