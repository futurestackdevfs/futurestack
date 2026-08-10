import {
  Controller,
  Headers,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { RazorpayClientService } from './razorpay-client.service';
import { CheckoutService } from './checkout.service';

/**
 * Public Razorpay webhook (no @Auth). Signature is verified against
 * RAZORPAY_WEBHOOK_SECRET using the raw request body.
 *
 * Always responds 200 once the event is accepted — Razorpay retries on any
 * non-2xx, and a downstream failure (email, etc.) must never cause a retry storm.
 * Processing errors are caught and logged inside the service.
 */
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly razorpayClient: RazorpayClientService,
    private readonly checkoutService: CheckoutService,
  ) {}

  @Post('razorpay')
  async handleRazorpay(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature?: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || !signature) {
      this.logger.warn('Razorpay webhook received without signature/body');
      throw new UnauthorizedException('Invalid signature');
    }

    const valid = this.razorpayClient.validateWebhookSignature(
      rawBody,
      signature,
    );
    if (!valid) {
      this.logger.warn(
        `Razorpay webhook signature verification failed — the webhook secret in .env likely differs from the one configured in the Razorpay Dashboard (rawBody bytes=${rawBody.length}, signature length=${signature.length})`,
      );
      throw new UnauthorizedException('Invalid signature');
    }

    let event: Record<string, any>;
    try {
      event = this.parseEvent(rawBody.toString());
    } catch {
      this.logger.warn('Razorpay webhook body is not valid JSON');
      return { received: true };
    }

    await this.checkoutService.handleWebhookEvent(event);

    return { received: true };
  }

  private parseEvent(raw: string): Record<string, any> {
    const parsed: unknown = JSON.parse(raw);
    return parsed as Record<string, any>;
  }
}
