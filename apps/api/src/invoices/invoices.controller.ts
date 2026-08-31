import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { InvoicesService } from './invoices.service';

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
      parseInt(page ?? '1') || 1,
      parseInt(perPage ?? '20') || 20,
    );
  }

  @Auth(Role.ADMIN, Role.COORDINATOR, Role.SALES, Role.STUDENT)
  @Get('order/:orderId')
  getInvoiceByOrder(@Param('orderId') orderId: string) {
    return this.invoicesService.getInvoiceByOrder(orderId);
  }

  @Auth(Role.ADMIN, Role.COORDINATOR, Role.SALES)
  @Post('generate/:orderId')
  createInvoice(@Param('orderId') orderId: string) {
    return this.invoicesService.createInvoice(orderId);
  }
}
