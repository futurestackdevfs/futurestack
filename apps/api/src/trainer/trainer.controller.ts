import { Controller, Get, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { TrainerService } from './trainer.service';
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
}
