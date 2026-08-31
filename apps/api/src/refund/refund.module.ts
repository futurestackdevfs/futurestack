import { Module } from '@nestjs/common';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';
import { MailModule } from '../mail/mail.module';
import { RazorpayClientService } from '../checkout/razorpay-client.service';

@Module({
  imports: [MailModule],
  controllers: [RefundController],
  providers: [RefundService, RazorpayClientService],
})
export class RefundModule {}
