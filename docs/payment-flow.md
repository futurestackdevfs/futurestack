# Payment Flow

End-to-end path from browsing to enrollment in the FutureStack platform.

```
Guest browse  →  add to cart (guest)  →  login  →  merge cart  →  coupon
→  create-order  →  Razorpay modal  →  verify/webhook  →  enrollment
```

## Flow

### 1. Guest cart → persisted cart

A guest builds a cart locally (course ids only). On login the frontend calls
`POST /cart/merge` with `{ courseIds: [...] }`. The API silently skips ids that
are missing, inactive, or already enrolled, and upserts the rest into the DB
cart. This never blocks login.

### 2. Applied coupon (optional)

`POST /cart/apply-coupon` `{ code }` validates against the live INR subtotal via
`CouponService.validate()`, stores `couponId` on the cart, and returns the
discount preview. `DELETE /cart/coupon` clears it.

### 3. Create order

`POST /checkout/create-order` `{ currency: 'INR' | 'USD' }` (rate-limited, 5/min):

- Checks the admin-controlled `PaymentSettings` singleton first — if the
  requested currency is disabled it returns `400` (e.g. INR disabled → `400`)
  before any gateway work starts, so a disabled currency can never reach
  Razorpay. The frontend cart page reads `GET /payment-settings/public` to hide
  the option in the first place.
- Loads the DB cart fresh; **never trusts any price/discount sent by the client**.
- Re-checks every item (active? not already enrolled?), removing + reporting
  failures (`409`).
- Re-validates the applied coupon from scratch; if expired it is cleared.
- Computes `subtotal`, `discountAmount`, `totalAmount` from live `CoursePrice`
  rows (minor-unit math), creates `Order(status: CREATED)` + `OrderItem[]`.
- Calls Razorpay `orders.create`; on failure rolls back the order (`503`).
- Returns `{ razorpayOrderId, amount, currency, keyId }`.

### 4. Razorpay modal

Frontend opens the Razorpay checkout with the amount, currency and key id, and
the order id as the "order_id".

### 5. Finalize — two independent, idempotent paths

- **Client:** the modal returns `{ razorpay_order_id, razorpay_payment_id,
  razorpay_signature }`; frontend calls `POST /checkout/verify`. API verifies
  the HMAC and calls `finalizeOrder()`.
- **Server:** Razorpay sends a `payment.captured` webhook; API verifies the
  signature and calls the **same** `finalizeOrder()`.

`finalizeOrder()` is idempotent via a single row-level guard: an `updateMany`
with `where: { id, status: 'CREATED' }` → `status: 'PAID'`. Only one caller wins
the transition; the other returns the already-created enrollments. It creates
enrollments, increments the coupon usage, records a `CouponRedemption`, and
clears the cart — all inside one transaction. Orders left `CREATED` for 2h are
expired by an hourly cron.

## Payment settings toggle (beta)

Admins control which currencies are available at checkout via the **Payment
Settings** panel (Configuration → Payment Settings in the ops admin). Backed by
a singleton `PaymentSettings` row.

| Field | Effect |
|-------|--------|
| `domesticEnabled` | Enables/disables **INR** (domestic gateway) at checkout |
| `internationalEnabled` | Enables/disables **USD** (international gateway) at checkout |

- **Seed:** `pnpm db:seed --filter api` inserts `{ domesticEnabled: true,
  internationalEnabled: false }` (INR on, USD off) — idempotent, existing rows
  are left untouched. The service also self-heals and creates the row with the
  same defaults on first read if the seed hasn't run.
- **Public:** `GET /payment-settings/public` → `{ domesticEnabled,
  internationalEnabled }` used by the cart page currency selector to hide a
  disabled currency, so a student never sees an option that will fail.
- **Admin:** `GET /admin/payment-settings` (read current state) and
  `PATCH /admin/payment-settings` `{ domesticEnabled?, internationalEnabled? }`
  (toggle). Admin only.
- **Enforcement (server-side):** `CheckoutService.createOrder` reads the
  settings and returns `400` for a disabled currency before any gateway work,
  so the toggle can't be bypassed by crafting a request.

## Required environment variables

Add all of these to `apps/api/.env` (or your deploy env). Without the Razorpay
keys the API **still boots** — INR/USD checkout simply returns `503` until the
keys are configured, while the rest of the platform keeps working.

| Variable | Purpose |
|----------|---------|
| `RAZORPAY_DOMESTIC_KEY_ID` | Key id for INR (domestic) gateway |
| `RAZORPAY_DOMESTIC_KEY_SECRET` | Key secret for INR (domestic) gateway — used to verify `/checkout/verify` signatures for INR orders |
| `RAZORPAY_INTL_KEY_ID` | Key id for USD (international) gateway |
| `RAZORPAY_INTL_KEY_SECRET` | Key secret for USD gateway — used to verify `/checkout/verify` signatures for USD orders |
| `RAZORPAY_WEBHOOK_SECRET` | Secret used to verify `x-razorpay-signature` on the webhook |

## Configuring the webhook in the Razorpay dashboard

1. Sign in to [Razorpay Dashboard](https://dashboard.razorpay.com) (separate
   dashboards for domestic/international accounts).
2. Go to **Settings → Webhooks → Add New Webhook**.
3. Events to subscribe (at minimum): `payment.captured` and `payment.failed`.
4. **Webhook URL:** the public URL of your API's webhook endpoint, e.g.
   `https://api.yourdomain.com/webhooks/razorpay`.
5. **Secret:** the value of `RAZORPAY_WEBHOOK_SECRET` (set the same value in the
   app env and in the dashboard).
6. Save. Razorpay will send the raw body with an `x-razorpay-signature` header
   that the API verifies against `RAZORPAY_WEBHOOK_SECRET` before processing.

> Tip: in dev, expose the API with a tool like `ngrok` and point the webhook URL
> at the tunneled `…/webhooks/razorpay` while you keep
> `RAZORPAY_DOMESTIC_KEY_ID/SECRET` set to your test key pair.