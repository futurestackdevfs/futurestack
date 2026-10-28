import { Controller, Get, Param, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { ReportsService } from './reports.service';

@Controller('admin/reports')
@Auth(Role.ADMIN)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** The list of reports the console offers. */
  @Get()
  catalog() {
    return this.reports.catalog();
  }

  /** ?from=YYYY-MM-DD&to=YYYY-MM-DD&currency=INR|USD — defaults to the last 30 days. */
  @Get(':type')
  run(
    @Param('type') type: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('currency') currency?: string,
  ) {
    return this.reports.run(type, { from, to, currency });
  }
}
