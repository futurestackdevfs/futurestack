import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator';
import { CoordinatorService } from './coordinator.service';

interface AuthenticatedRequest extends Request {
  user: { id: string; role: Role };
}

@Controller('coordinator')
@Auth(Role.COORDINATOR, Role.ADMIN)
export class CoordinatorController {
  constructor(private readonly coordinatorService: CoordinatorService) {}

  @Get('dashboard')
  getDashboard() {
    return this.coordinatorService.getDashboard();
  }

  @Get('batches')
  getBatches() {
    return this.coordinatorService.getBatches();
  }

  @Get('students')
  getStudents(@Query('q') q?: string) {
    return this.coordinatorService.getStudents(q);
  }

  @Patch('students/:id/flag')
  updateStudentFlag(
    @Param('id') id: string,
    @Body() body: { flag: string; note?: string },
  ) {
    return this.coordinatorService.updateStudentFlag(id, body.flag, body.note);
  }

  @Get('escalations')
  getEscalations() {
    return this.coordinatorService.getEscalations();
  }

  @Patch('escalations/:id')
  resolveEscalation(
    @Param('id') id: string,
    @Body() body: { resolution: string },
  ) {
    return this.coordinatorService.resolveEscalation(id, body.resolution);
  }

  @Get('trainers')
  getTrainers() {
    return this.coordinatorService.getTrainers();
  }

  @Get('payments')
  getPayments(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.coordinatorService.getPayments(
      status,
      page ? Number(page) : 1,
      perPage ? Number(perPage) : 10,
    );
  }
}
