import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { StudentService } from './student.service';
import { UpdateVideoProgressDto } from './dto/update-video-progress.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Auth(Role.STUDENT)
  @Get('dashboard')
  async getDashboard(@Req() req: Request) {
    const user = req.user as { id: string; email: string; name: string; role: string };
    return this.studentService.getDashboard(user.id, user);
  }

  @Auth(Role.STUDENT)
  @Get('courses/:courseId')
  async getCourseDetail(@Req() req: Request, @Param('courseId') courseId: string) {
    const user = req.user as { id: string };
    return this.studentService.getCourseDetail(user.id, courseId);
  }

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

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.STUDENT)
  @Post('quizzes/:quizId/submit')
  async submitQuiz(
    @Param('quizId') quizId: string,
    @Body() dto: SubmitQuizDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.studentService.submitQuiz(user.id, quizId, dto.score);
  }
}