import { Controller, Get, Post, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { InvoicesService } from './invoices.service';
import { clampPageSize } from '../common/page-size.pipe';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Auth(Role.ADMIN, Role.COORDINATOR, Role.SALES)
  @Get()
  listInvoices(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.invoicesService.listInvoices(
      Math.max(1, parseInt(page ?? '1') || 1),
      clampPageSize(perPage, 20, 100),
    );
  }

  @Auth(Role.ADMIN, Role.COORDINATOR, Role.SALES, Role.STUDENT)
  @Get('order/:orderId')
  getInvoiceByOrder(
    @Param('orderId') orderId: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string; role: Role };
    return this.invoicesService.getInvoiceByOrder(orderId, user);
  }

  @Auth(Role.ADMIN, Role.COORDINATOR, Role.SALES)
  @Post('generate/:orderId')
  createInvoice(@Param('orderId') orderId: string) {
    return this.invoicesService.createInvoice(orderId);
  }
}
