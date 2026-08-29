import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator';
import { SalesTargetsService } from './sales-targets.service';

@Controller('sales-targets')
@Auth(Role.SALES, Role.ADMIN, Role.COORDINATOR)
export class SalesTargetsController {
  constructor(private readonly salesTargetsService: SalesTargetsService) {}

  @Get()
  getTargets(@Req() req: Request) {
    const user = req.user as { id: string; role: Role };
    return this.salesTargetsService.getTargets(user.id, user.role);
  }

  @Auth(Role.ADMIN, Role.COORDINATOR)
  @Post()
  createTarget(
    @Req() req: Request,
    @Body() dto: {
      salespersonId: string;
      courseId?: string;
      period: string;
      targetAmount: number;
      startDate: string;
      endDate: string;
    },
  ) {
    return this.salesTargetsService.createTarget(
      (req.user as { id: string }).id,
      dto,
    );
  }

  @Auth(Role.ADMIN, Role.COORDINATOR)
  @Patch(':id')
  updateTarget(
    @Param('id') id: string,
    @Body() dto: {
      targetAmount?: number;
      period?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.salesTargetsService.updateTarget(id, dto);
  }

  @Auth(Role.ADMIN, Role.COORDINATOR)
  @Delete(':id')
  deleteTarget(@Param('id') id: string) {
    return this.salesTargetsService.deleteTarget(id);
  }

  @Post('refresh')
  refreshAmounts(@Req() req: Request) {
    const user = req.user as { id: string; role: Role };
    return this.salesTargetsService.refreshCurrentAmounts(user.id, user.role);
  }
}
