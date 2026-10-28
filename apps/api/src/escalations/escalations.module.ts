import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { EscalationsController } from './escalations.controller';
import { EscalationsService } from './escalations.service';
import { EscalationScanService } from './escalation-scan.service';

@Module({
  imports: [MailModule],
  controllers: [EscalationsController],
  providers: [EscalationsService, EscalationScanService],
  exports: [EscalationsService],
})
export class EscalationsModule {}
