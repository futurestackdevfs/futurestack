import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { StudentService } from './student.service';
import { UpdateVideoProgressDto } from './dto/update-video-progress.dto';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Auth(Role.STUDENT)
  @Get('dashboard')
  async getDashboard(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.studentService.getDashboard(user.id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Auth(Role.STUDENT)
  @Get('courses/:courseId')
  async getCourseDetail(@Req() req: Request, @Param('courseId') courseId: string) {
    const user = req.user as { id: string };
    return this.studentService.getCourseDetail(user.id, courseId);
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Auth(Role.STUDENT)
  @Post('videos/:videoId/progress')
  async updateVideoProgress(
    @Req() req: Request,
    @Param('videoId') videoId: string,
    @Body() dto: UpdateVideoProgressDto,
  ) {
    const user = req.user as { id: string };
    return this.studentService.updateVideoProgress(user.id, videoId, dto.positionSec);
  }
}