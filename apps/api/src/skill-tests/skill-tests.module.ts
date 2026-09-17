import { Module } from '@nestjs/common';
import { SkillTestsController } from './skill-tests.controller';
import { SkillTestsService } from './skill-tests.service';

@Module({
  controllers: [SkillTestsController],
  providers: [SkillTestsService],
})
export class SkillTestsModule {}
