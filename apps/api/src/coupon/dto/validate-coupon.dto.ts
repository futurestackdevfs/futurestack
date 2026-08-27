import { Currency } from '@prisma/client';

/**
 * Internal input shape for CouponService.validate() — not a route body.
 * Callers (CartService.applyCoupon, CheckoutService.createOrder) build this
 * from freshly-loaded DB state so a coupon is never validated against
 * frontend-provided prices or course lists.
 */
export class ValidateCouponDto {
  code: string;
  userId: string;
  currency: Currency;
  /** Cart subtotal in `currency` major units. */
  subtotal: number;
  /** Course ids currently in the cart. */
  courseIds: string[];
  /** Project ids currently in the cart. */
  projectIds?: string[];
}