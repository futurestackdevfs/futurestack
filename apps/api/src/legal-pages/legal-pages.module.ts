import { Module } from '@nestjs/common';
import { LegalPagesController } from './legal-pages.controller';
import { LegalPagesService } from './legal-pages.service';

@Module({
  controllers: [LegalPagesController],
  providers: [LegalPagesService],
  exports: [LegalPagesService],
})
export class LegalPagesModule {}
