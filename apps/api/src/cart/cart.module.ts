import { Module } from '@nestjs/common';
import { CouponModule } from '../coupon/coupon.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [CouponModule],
  controllers: [CartController, WishlistController],
  providers: [CartService, WishlistService],
})
export class CartModule {}
