import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { WishlistService } from './wishlist.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Auth(Role.STUDENT)
  @Get()
  getWishlist(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.wishlistService.getWishlistView(user.id);
  }

  @Auth(Role.STUDENT)
  @Post('items')
  addItem(@Req() req: Request, @Body() dto: AddCartItemDto) {
    const user = req.user as { id: string };
    if (!dto.courseId) throw new BadRequestException('courseId is required for wishlist');
    return this.wishlistService.addItem(user.id, dto.courseId);
  }

  @Auth(Role.STUDENT)
  @Delete('items/:courseId')
  removeItem(@Req() req: Request, @Param('courseId') courseId: string) {
    const user = req.user as { id: string };
    return this.wishlistService.removeItem(user.id, courseId);
  }

  @Auth(Role.STUDENT)
  @Post(':courseId/move-to-cart')
  moveToCart(@Req() req: Request, @Param('courseId') courseId: string) {
    const user = req.user as { id: string };
    return this.wishlistService.moveToCart(user.id, courseId);
  }
}
