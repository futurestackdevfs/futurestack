import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { StudentService } from './student.service';
import { UpdateVideoProgressDto } from './dto/update-video-progress.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Auth(Role.STUDENT)
  @Get('dashboard')
  async getDashboard(@Req() req: Request) {
    const user = req.user as {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    return this.studentService.getDashboard(user.id, user);
  }

  @Auth(Role.STUDENT)
  @Get('courses/:courseId')
  async getCourseDetail(
    @Req() req: Request,
    @Param('courseId') courseId: string,
  ) {
    const user = req.user as { id: string };
    return this.studentService.getCourseDetail(user.id, courseId);
  }

  // Heartbeats are ~6/min per client; allow bursts of forced flushes without
  // allowing position spam to become an abuse vector.
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Auth(Role.STUDENT)
  @Post('videos/:videoId/progress')
  async updateVideoProgress(
    @Req() req: Request,
    @Param('videoId') videoId: string,
    @Body() dto: UpdateVideoProgressDto,
  ) {
    const user = req.user as { id: string };
    return this.studentService.updateVideoProgress(
      user.id,
      videoId,
      dto.positionSec,
    );
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

  @Auth(Role.STUDENT)
  @Get('videos/:videoId/otp')
  async getVideoOtp(@Param('videoId') videoId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.studentService.getVideoOtp(user.id, videoId);
  }

  // ────────────────────────────────────────────────
  // PROFILE endpoints
  // ────────────────────────────────────────────────

  /** GET /student/profile */
  @Auth(Role.STUDENT)
  @Get('profile')
  async getProfile(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.studentService.getProfile(user.id);
  }

  /** PUT /student/profile */
  @Auth(Role.STUDENT)
  @Put('profile')
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const user = req.user as { id: string };
    return this.studentService.updateProfile(user.id, dto);
  }

  /** POST /student/avatar */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Auth(Role.STUDENT)
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname)) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 512 * 1024 },
    }),
  )
  async uploadAvatar(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const user = req.user as { id: string };
    return this.studentService.updateAvatar(user.id, file);
  }
}
