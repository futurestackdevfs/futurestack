import { Module } from '@nestjs/common';
import { CouponModule } from '../coupon/coupon.module';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [CouponModule, PaymentSettingsModule],
  controllers: [CartController, WishlistController],
  providers: [CartService, WishlistService],
})
export class CartModule {}
