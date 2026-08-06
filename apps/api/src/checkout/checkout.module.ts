import { Module } from '@nestjs/common';
import { CouponModule } from '../coupon/coupon.module';
import { CartModule } from '../cart/cart.module';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { CheckoutController } from './checkout.controller';
import { WebhookController } from './webhook.controller';
import { CheckoutService } from './checkout.service';
import { RazorpayClientService } from './razorpay-client.service';

@Module({
  imports: [CartModule, CouponModule, PaymentSettingsModule],
  controllers: [CheckoutController, WebhookController],
  providers: [CheckoutService, RazorpayClientService],
})
export class CheckoutModule {}
