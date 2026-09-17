import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { VdoCipherWebhookGuard } from './vdocipher-webhook.guard';
import { MailModule } from '../mail/mail.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  controllers: [AdminController],
  providers: [AdminService, VdoCipherWebhookGuard],
  imports: [MailModule, UploadModule],
})
export class AdminModule {}
