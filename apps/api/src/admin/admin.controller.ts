import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminService } from './admin.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { RejectTrainerDto } from './dto/reject-trainer.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Trainer approval is content-management work — shared with Content Manager.
  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Get('trainers/pending')
  async listPendingTrainers() {
    return this.adminService.listPendingTrainers();
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('trainers/:id/approve')
  async approveTrainer(@Param('id') id: string) {
    return this.adminService.approveTrainer(id);
  }

  @Auth(Role.ADMIN, Role.CONTENT_MANAGER)
  @Post('trainers/:id/reject')
  async rejectTrainer(@Param('id') id: string, @Body() dto: RejectTrainerDto) {
    return this.adminService.rejectTrainer(id, dto.reason);
  }

  // Account provisioning stays ADMIN-only — a Content Manager shouldn't be
  // able to create more staff accounts (including more Content Managers).
  @Auth(Role.ADMIN)
  @Post('staff')
  async createStaffAccount(@Body() dto: CreateStaffDto) {
    return this.adminService.createStaffAccount(dto);
  }
}