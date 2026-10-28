import { Module } from '@nestjs/common';
import { TrainerController } from './trainer.controller';
import { TrainerService } from './trainer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { EscalationsModule } from '../escalations/escalations.module';

@Module({
  imports: [PrismaModule, UploadModule, EscalationsModule],
  controllers: [TrainerController],
  providers: [TrainerService],
})
export class TrainerModule {}
