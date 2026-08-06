# Coupon Module

Path: `apps/api/src/coupon/`

Coupon admin CRUD plus the shared `CouponService.validate()` used by both
`CartService.applyCoupon()` and `CheckoutService.createOrder()`.
`CouponModule` exports `CouponService`.

## Admin routes (`@Auth(Role.ADMIN)`)

| Method | Path               | Auth  | Body | Success response | Error cases |
|--------|--------------------|-------|------|------------------|-------------|
| POST   | `/admin/coupons`   | ADMIN | `CreateCouponDto` | created `Coupon` | `400` PERCENT value not in 0–100 · `400` FLAT without currency · `409` duplicate code |
| GET    | `/admin/coupons?page=&perPage=` | ADMIN | – | `{ items, total, page, perPage }` | – |
| GET    | `/admin/coupons/:id` | ADMIN | – | `Coupon` + `redemptions` count | `404` not found |
| PATCH  | `/admin/coupons/:id` | ADMIN | `UpdateCouponDto` (all optional) | updated `Coupon` | `404` not found · `409` duplicate code · `400` invalid PERCENT/FLAT combo |
| PATCH  | `/admin/coupons/:id/deactivate` | ADMIN | – | updated `Coupon` | `404` not found |

`PATCH /admin/coupons/:id/deactivate` is a **soft deactivate** — it flips
`isActive` to `false` rather than removing the row, because `CouponRedemption`
rows reference `Coupon` (a hard delete would need onDelete handling). There is
intentionally no hard-delete route.

### `CreateCouponDto`

```ts
{
  code: string,                 // uppercased on save; letters, digits, - and _
  discountType: 'PERCENT' | 'FLAT',
  value: number,                // PERCENT: 0–100 · FLAT: absolute amount
  currency?: 'INR' | 'USD',     // required when discountType = FLAT
  applicableCourseIds?: string[],  // empty = applies to everything
  minOrderAmount?: number,
  maxUses?: number,             // null = unlimited
  perUserLimit?: number,        // default 1
  isActive?: boolean,           // default true
  validFrom?: string,           // ISO date
  validUntil?: string,          // ISO date
}
```

## `CouponService.validate(input: ValidateCouponDto)`

Used by `/cart/apply-coupon` (preview + store) and `/checkout/create-order`
(re-validate before payment). `ValidateCouponDto` is an internal input shape
built by callers from freshly-loaded DB state — never from frontend-sent prices
or course lists:

```ts
{
  code: string,
  userId: string,
  currency: 'INR' | 'USD',
  subtotal: number,        // cart subtotal in major units
  courseIds: string[],     // course ids currently in the cart
}
```

It **never mutates anything** and returns `{ coupon, discountAmount }`. Failure
throws `BadRequestException` with a specific reason (the frontend shows it
verbatim):

| Check | Message |
|-------|---------|
| code doesn't exist | `Coupon not found` |
| `isActive === false` | `This coupon is no longer active` |
| before `validFrom` | `This coupon is not valid yet` |
| after `validUntil` | `This coupon has expired` |
| `usedCount >= maxUses` | `This coupon has reached its usage limit` |
| redemptions for this user `>= perUserLimit` | `You have already used this coupon` |
| `applicableCourseIds` set and no cart item matches | `This coupon does not apply to items in your cart` |
| subtotal < `minOrderAmount` | `Minimum order amount of <amount> <currency> not met` |
| FLAT and `currency !== cart.currency` | `This coupon is not valid for the selected currency` |

Discount math works in integer minor units (paise/cents) internally to avoid
float precision bugs; Razorpay amounts are converted at the boundary
(`amount × 100`).
