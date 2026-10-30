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
import { RequestRefundDto } from './dto/request-refund.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';
import { Audit } from '../audit/audit.decorator';

/**
 * Who can do what:
 *  - SUPPORT + ADMIN: look up what is refundable, raise a refund request from a ticket,
 *    cancel a request that is still pending, and see the refund list / status.
 *  - ADMIN only: issue a refund straight away, approve a pending request, reject.
 */
@Controller('admin/refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  /** Admin: refund immediately (no approval step). */
  @Auth(Role.ADMIN)
  @Audit({ action: 'REFUND', entity: 'Refund', idFrom: 'response' })
  @Post()
  create(@Body() dto: CreateRefundDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.refundService.createRefund(dto, user.id);
  }

  /** Support (or admin): raise a refund request — it stays PENDING until an admin approves it. */
  @Auth(Role.SUPPORT, Role.ADMIN)
  @Audit({ action: 'REFUND_REQUEST', entity: 'Refund', idFrom: 'response' })
  @Post('request')
  request(@Body() dto: RequestRefundDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.refundService.requestRefund(dto, user);
  }

  /** What the student paid for this item and what a refund would return. */
  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('preview')
  preview(
    @Query('orderId') orderId: string,
    @Query('courseId') courseId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.refundService.previewRefund({ orderId, courseId, projectId });
  }

  /** A student's orders, item by item, with what can still be refunded. */
  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get('options')
  options(@Query('studentId') studentId: string) {
    return this.refundService.refundOptions(studentId);
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get()
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('ticketId') ticketId?: string,
    @Query('mine') mine?: string,
    @Req() req?: Request,
  ) {
    const user = (req as any)?.user;
    return this.refundService.listRefunds(
      status,
      page ? Number(page) : 1,
      perPage ? Number(perPage) : 10,
      ticketId,
      mine === 'true' ? user?.id : undefined,
    );
  }

  @Auth(Role.SUPPORT, Role.ADMIN)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.refundService.getRefund(id);
  }

  /** Admin: approve a pending request — sends the money via Razorpay. */
  @Auth(Role.ADMIN)
  @Audit({ action: 'APPROVE', entity: 'Refund' })
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.refundService.approveRefund(id, user.id);
  }

  /** Support (or admin): withdraw a request that is still waiting for an admin. */
  @Auth(Role.SUPPORT, Role.ADMIN)
  @Audit({ action: 'CANCEL', entity: 'Refund' })
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.refundService.cancelRefund(id, user);
  }

  @Auth(Role.ADMIN)
  @Audit({ action: 'REJECT', entity: 'Refund' })
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body?: RejectRefundDto,
  ) {
    const user = (req as any).user;
    return this.refundService.rejectRefund(id, user.id, body?.reason);
  }
}
