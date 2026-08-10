# Cart & Wishlist Module

Path: `apps/api/src/cart/`

Handles the student's shopping cart, coupon application preview, and wishlist.
All routes require `@Auth(Role.STUDENT)`. A `Cart` / `Wishlist` row is created
lazily on first use (one per user, `userId` unique).

## Cart routes

| Method | Path                     | Auth          | Body                    | Success response | Error cases |
|--------|--------------------------|---------------|-------------------------|------------------|-------------|
| GET    | `/cart?currency=INR`     | STUDENT       | –                       | Cart view (see below) | `400` if any item has no `CoursePrice` in the requested currency |
| POST   | `/cart/items`            | STUDENT       | `{ courseId: string }`  | Cart view (INR) | `404` course missing / not `ACTIVE` · `409` already enrolled · duplicate add is a silent no-op |
| DELETE | `/cart/items/:courseId`  | STUDENT       | –                       | Cart view (INR) | `404` item not in cart |
| POST   | `/cart/merge`            | STUDENT       | `{ courseIds: string[] }` | Cart view (INR) | never throws per bad id — missing / inactive / already-enrolled ids are skipped silently (runs on login) |
| POST   | `/cart/apply-coupon`     | STUDENT       | `{ code: string }`      | `{ coupon, discountAmount, subtotal, total, currency }` | `400` with the real reason (see CouponService) |
| DELETE | `/cart/coupon`           | STUDENT       | –                       | Cart view (INR) | none (no-op if no coupon applied) |

### Cart view shape

```json
{
  "items": [
    { "courseId": "…", "title": "…", "thumbnail": "…", "price": 2999, "currency": "INR" }
  ],
  "coupon": { "id": "…", "code": "FLAT10", "discountType": "FLAT", "value": 100 } | null,
  "discountAmount": 100,
  "subtotal": 2999,
  "total": 2899,
  "currency": "INR"
}
```

- Prices are always read live from `CoursePrice` rows in the requested
  currency (`?currency=`, default `INR`). If a course has no row for that
  currency the request fails with `400 Course not available in this currency` —
  we never silently substitute another currency's number.
- The applied coupon is re-validated for the preview; if it has become invalid
  it is still shown but with `discountAmount: 0`.

## Wishlist routes

| Method | Path                            | Auth    | Body                  | Success response | Error cases |
|--------|---------------------------------|---------|-----------------------|------------------|-------------|
| GET    | `/wishlist`                     | STUDENT | –                     | `{ items: [{ courseId, title, thumbnail, price, currency }] }` | – |
| POST   | `/wishlist/items`               | STUDENT | `{ courseId: string }` | wishlist view | `404` course missing / not `ACTIVE` · `409` already enrolled · duplicate add is a no-op |
| DELETE | `/wishlist/items/:courseId`     | STUDENT | –                     | wishlist view    | `404` not in wishlist |
| POST   | `/wishlist/:courseId/move-to-cart` | STUDENT | –                   | `{ moved: true, courseId }` | `404` not in wishlist · `409` already enrolled |

`move-to-cart` runs inside a single `$transaction`: it verifies the wishlist
item exists, removes it, and upserts it into the cart atomically.

## Error handling

- All writes that could hit a unique constraint (`Cart.userId`, `CartItem`,
  `WishlistItem`) use `upsert` with the compound unique key, so P2002 can't
  surface — duplicate adds are no-ops by construction.
- Lazy `Cart`/`Wishlist` creation races are guarded: a concurrent duplicate
  create is caught and re-read instead of leaking as a 500.
