# Checkout Module

Path: `apps/api/src/checkout/`

Creates Razorpay orders from the DB cart, verifies payments, and consumes
Razorpay webhooks. Uses the `razorpay` SDK (`RazorpayClientService`), a single
client for the single Razorpay account (`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`).
International payments will be activated later on the same account, so there is
no per-currency client split.

## Routes

| Method | Path                 | Auth                 | Body | Success response | Error cases |
|--------|----------------------|----------------------|------|------------------|-------------|
| POST   | `/checkout/create-order` | STUDENT + `@Throttle(5/min)` | `{ currency: 'INR' \| 'USD' }` | `{ razorpayOrderId, amount, currency, keyId }` | `400 Cart is empty` · `400 Course not available in this currency` · `409` listing dropped items + reason · `503 Payment gateway unavailable` |
| POST   | `/checkout/verify`   | STUDENT              | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | created `Enrollment[]` | `404` order not found · `403` verifying someone else's order · `400 Payment verification failed` (tampered signature, logged) |
| POST   | `/webhooks/razorpay` | none (public)        | raw JSON body         | `{ received: true }` (always 200 once signature is valid) | `401` invalid/missing signature |

## How `create-order` works

1. Loads the DB cart **fresh** — prices, discounts, coupon are never trusted
   from the frontend.
2. `400 Cart is empty` if there are no items.
3. Re-checks every item: still `ACTIVE`? still not enrolled? Failing items are
   removed from the cart and a `409` is returned listing each dropped course
   with its reason.
4. Loads live `CoursePrice` rows for the requested currency (falls back to the
   course's base price when no row exists).
5. Re-validates any applied coupon via `CouponService.validate()`. If it is no
   longer valid it is **cleared from the cart** and checkout continues with the
   real (undiscounted) total — the amount charged is always correct.
6. Creates `Order(status: CREATED)` + `OrderItem[]` (snapshotting
   `priceAtPurchase`) in one transaction.
7. Calls `razorpay.orders.create({ amount: total × 100, currency, receipt: order.id })`.
   If the call fails the local Order is deleted and `503 Payment gateway
   unavailable` is thrown — never an orphaned CREATED order.
8. Saves the real `razorpayOrderId` and returns `{ razorpayOrderId, amount,
   totalAmount, currency, keyId }`.

The order id is generated client-side and used as the temporary
`razorpayOrderId` so the NOT NULL unique column never collides under
concurrency; it's overwritten with the real Razorpay id.

## How idempotency works

Two independent paths can finalize the same order: the client-side
`/checkout/verify` call and the server-side `payment.captured` webhook. They can
race, and Razorpay retries webhooks. To make finalization safe:

- **Single row-level guard.** `finalizeOrder()` runs an `updateMany` with
  `where: { id, status: 'CREATED' }` → `status: 'PAID'`. Exactly one caller can
  transition `CREATED → PAID`; every other caller sees `updated.count === 0` and
  returns the existing enrollments as a no-op.
- **No check-then-act.** We deliberately do *not* `findUnique` + if-check +
  separate update — that has a race window where two requests both read
  `CREATED` and both create enrollments.
- Everything else (enrollment creation, coupon `usedCount` increment +
  `CouponRedemption` row, cart clear) happens *after* the winning transition,
  inside the same transaction, so it runs exactly once.

The hourly `@Cron('0 * * * *')` job marks orders still `CREATED` after 2 hours
as `EXPIRED`.

## Webhook behaviour

- Verified against `RAZORPAY_WEBHOOK_SECRET` using `req.rawBody`
  (Nest `rawBody: true` — normal JSON parsing is unaffected on other routes).
- `payment.captured` → calls the same `finalizeOrder()` as `/checkout/verify`.
- `payment.failed` → `FAILED` idempotently (only if not already `PAID`).
- Always returns 200 for a valid event; processing errors are caught and logged
  internally so a downstream failure never triggers a Razorpay retry storm.
