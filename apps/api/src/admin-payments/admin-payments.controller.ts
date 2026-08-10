import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminPaymentsService } from './admin-payments.service';

@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly adminPaymentsService: AdminPaymentsService) {}

  @Auth(Role.ADMIN)
  @Get()
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.adminPaymentsService.listPayments(
      status,
      page ? Number(page) : 1,
      perPage ? Number(perPage) : 10,
    );
  }
}
