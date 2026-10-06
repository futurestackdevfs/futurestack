import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ReviewsService } from '../reviews/reviews.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { VdoCipherModule } from '../vdocipher/vdocipher.module';
import { RoadmapGenerator } from '../courses/roadmap/roadmap-generator';
import { ProjectRoadmapService } from './roadmap/project-roadmap.service';

@Module({
  imports: [PrismaModule, UploadModule, VdoCipherModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ReviewsService, RoadmapGenerator, ProjectRoadmapService],
})
export class ProjectsModule {}
