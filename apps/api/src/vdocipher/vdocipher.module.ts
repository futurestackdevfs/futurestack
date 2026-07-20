import { Module, Global } from '@nestjs/common';
import { VdoCipherService } from './vdocipher.service';

@Global()
@Module({
  providers: [VdoCipherService],
  exports: [VdoCipherService],
})
export class VdoCipherModule {}
