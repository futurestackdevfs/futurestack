import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { UploadModule } from '../upload/upload.module';
import { RoadmapGenerator } from './roadmap/roadmap-generator';
import { CourseRoadmapService } from './roadmap/course-roadmap.service';

@Module({
  imports: [UploadModule],
  controllers: [CoursesController],
  providers: [CoursesService, RoadmapGenerator, CourseRoadmapService],
})
export class CoursesModule {}
