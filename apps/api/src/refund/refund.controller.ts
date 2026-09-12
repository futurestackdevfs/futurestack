import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { Audit } from '../audit/audit.decorator';

@Controller('admin/refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Auth(Role.ADMIN)
  @Audit({ action: 'REFUND', entity: 'Refund', idFrom: 'response' })
  @Post()
  create(@Body() dto: CreateRefundDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.refundService.createRefund(dto, user.id);
  }

  @Auth(Role.ADMIN)
  @Get()
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.refundService.listRefunds(
      status,
      page ? Number(page) : 1,
      perPage ? Number(perPage) : 10,
    );
  }

  @Auth(Role.ADMIN)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.refundService.getRefund(id);
  }

  @Auth(Role.ADMIN)
  @Audit({ action: 'REJECT', entity: 'Refund' })
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.refundService.rejectRefund(id);
  }
}
