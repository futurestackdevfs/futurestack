import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { CheckoutService } from './checkout.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Auth(Role.STUDENT)
  @Post('create-order')
  createOrder(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const user = req.user as { id: string };
    return this.checkoutService.createOrder(user.id, dto);
  }

  @Auth(Role.STUDENT)
  @Post('verify')
  verify(@Req() req: Request, @Body() dto: VerifyPaymentDto) {
    const user = req.user as { id: string };
    return this.checkoutService.verifyPayment(user.id, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Auth(Role.STUDENT)
  @Post('cancel')
  cancel(@Req() req: Request, @Body() dto: CancelOrderDto) {
    const user = req.user as { id: string };
    return this.checkoutService.cancelOrder(user.id, dto.razorpayOrderId);
  }
}
