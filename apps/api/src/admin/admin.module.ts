import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MailModule } from '../mail/mail.module';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [MailModule],
})
export class AdminModule {}
