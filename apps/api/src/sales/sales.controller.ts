import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Req,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Auth } from '../auth/decorators/auth.decorator';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; role: Role };
}

@Controller('sales')
@Auth(Role.SALES, Role.ADMIN, Role.COORDINATOR)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('dashboard')
  getDashboard(@Req() req: AuthenticatedRequest) {
    return this.salesService.getDashboard(req.user.id, req.user.role);
  }

  @Get('courses')
  listCourses() {
    return this.salesService.listCourses();
  }

  @Get('students')
  listStudents(@Query('q') q?: string) {
    return this.salesService.listStudents(q);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('sale')
  createSale(@Req() req: AuthenticatedRequest, @Body() dto: CreateSaleDto) {
    return this.salesService.createSale(req.user.id, dto);
  }

  /* ── Pending payments (processing orders) ── */

  @Get('orders/pending')
  listPendingOrders(@Req() req: AuthenticatedRequest) {
    return this.salesService.listPendingOrders(req.user.id, req.user.role);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('orders/:id/confirm-payment')
  confirmPayment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.salesService.confirmPayment(
      req.user.id,
      req.user.role,
      id,
      dto.paymentMethod,
    );
  }

  /* ── Lead management ── */

  @Get('leads')
  listLeads(@Req() req: AuthenticatedRequest, @Query('q') q?: string) {
    return this.salesService.listLeads(req.user.id, req.user.role, q);
  }

  @Get('leads/:id')
  getLead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.salesService.getLead(req.user.id, req.user.role, id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('leads')
  createLead(@Req() req: AuthenticatedRequest, @Body() dto: CreateLeadDto) {
    return this.salesService.createLead(req.user.id, dto);
  }

  @Patch('leads/:id')
  updateLead(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.salesService.updateLead(req.user.id, req.user.role, id, dto);
  }

  @Delete('leads/:id')
  deleteLead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.salesService.deleteLead(req.user.id, req.user.role, id);
  }
}
