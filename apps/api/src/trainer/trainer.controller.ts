import {
  Controller,
  Get,
  Post,
  Put,
  Req,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { TrainerService } from './trainer.service';
import { UpdateProfileDto } from '../student/dto/update-profile.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { id: string; role: Role };
}

@Controller('trainer')
@Auth(Role.TRAINER)
export class TrainerController {
  constructor(private readonly trainerService: TrainerService) {}

  @Get('dashboard')
  getDashboard(@Req() req: AuthenticatedRequest) {
    return this.trainerService.getDashboard(req.user.id);
  }

  @Get('revenue')
  getRevenue(@Req() req: AuthenticatedRequest) {
    return this.trainerService.getRevenue(req.user.id);
  }

  @Get('students')
  getStudents(@Req() req: AuthenticatedRequest) {
    return this.trainerService.getStudents(req.user.id);
  }

  @Get('doubts')
  getDoubts(@Req() req: AuthenticatedRequest) {
    return this.trainerService.getDoubts(req.user.id);
  }

  @Get('reviews')
  getReviews(@Req() req: AuthenticatedRequest) {
    return this.trainerService.getReviews(req.user.id);
  }

  @Get('projects')
  getProjects(@Req() req: AuthenticatedRequest) {
    return this.trainerService.getProjects(req.user.id);
  }

  @Post('flag-student')
  flagStudent(
    @Req() req: AuthenticatedRequest,
    @Body() body: { studentId: string; reason?: string },
  ) {
    return this.trainerService.flagStudent(req.user.id, body.studentId, body.reason);
  }

  // ────────────────────────────────────────────────
  // PROFILE endpoints
  // ────────────────────────────────────────────────

  /** GET /trainer/profile */
  @Get('profile')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.trainerService.getProfile(req.user.id);
  }

  /** PUT /trainer/profile */
  @Put('profile')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.trainerService.updateProfile(req.user.id, dto);
  }

  /** POST /trainer/avatar */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
  uploadAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.trainerService.updateAvatar(req.user.id, file);
  }
}
