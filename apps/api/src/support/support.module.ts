import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [PrismaModule, MailModule, AuthModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
