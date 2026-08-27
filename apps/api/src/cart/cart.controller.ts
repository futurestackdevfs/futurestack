import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Currency, Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Auth(Role.STUDENT)
  @Get()
  getCart(@Req() req: Request, @Query('currency') currency?: Currency) {
    const user = req.user as { id: string };
    return this.cartService.getCartView(user.id, currency ?? 'INR');
  }

  @Auth(Role.STUDENT)
  @Post('items')
  addItem(@Req() req: Request, @Body() dto: AddCartItemDto) {
    const user = req.user as { id: string };
    return this.cartService.addItem(user.id, dto.courseId, dto.projectId);
  }

  @Auth(Role.STUDENT)
  @Delete('items/:courseId')
  removeItem(@Req() req: Request, @Param('courseId') courseId: string) {
    const user = req.user as { id: string };
    return this.cartService.removeItem(user.id, courseId);
  }

  @Auth(Role.STUDENT)
  @Post('merge')
  merge(@Req() req: Request, @Body() dto: MergeCartDto) {
    const user = req.user as { id: string };
    return this.cartService.mergeCart(user.id, dto.courseIds);
  }

  @Auth(Role.STUDENT)
  @Post('apply-coupon')
  applyCoupon(@Req() req: Request, @Body() dto: ApplyCouponDto) {
    const user = req.user as { id: string };
    return this.cartService.applyCoupon(user.id, dto.code);
  }

  @Auth(Role.STUDENT)
  @Delete('coupon')
  clearCoupon(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.cartService.clearCoupon(user.id);
  }
}
