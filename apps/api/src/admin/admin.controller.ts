import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminService } from './admin.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { RejectTrainerDto } from './dto/reject-trainer.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('stats')
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  // Trainer approval is content-management work — shared with Content Manager.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('trainers/pending')
  async listPendingTrainers() {
    return this.adminService.listPendingTrainers();
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('trainers/approved')
  async listApprovedTrainers() {
    return this.adminService.listApprovedTrainers();
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('trainers/:id/approve')
  async approveTrainer(@Param('id') id: string) {
    return this.adminService.approveTrainer(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('trainers/:id/reject')
  async rejectTrainer(@Param('id') id: string, @Body() dto: RejectTrainerDto) {
    return this.adminService.rejectTrainer(id, dto.reason);
  }

  // Account provisioning stays ADMIN-only — a Content Manager shouldn't be
  // able to create more staff accounts (including more Content Managers).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.ADMIN)
  @Post('staff')
  async createStaffAccount(@Body() dto: CreateStaffDto) {
    return this.adminService.createStaffAccount(dto);
  }
}
