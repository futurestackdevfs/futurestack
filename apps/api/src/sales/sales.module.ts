import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { PublicLeadsController } from './public-leads.controller';
import { SalesService } from './sales.service';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PaymentSettingsModule, MailModule],
  controllers: [SalesController, PublicLeadsController],
  providers: [SalesService],
})
export class SalesModule {}
