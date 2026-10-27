const round2 = (n: number) => Math.round(n * 100) / 100;

/** Refund timeline fallback when PaymentSettings has no row/value yet. */
export const DEFAULT_REFUND_ETA_DAYS = 7;

export interface RefundBreakdown {
  /** List price of the item before any coupon. */
  itemPrice: number;
  /** Share of the order's coupon discount that was applied to this item. */
  couponDiscount: number;
  /** GST charged on (itemPrice − couponDiscount). */
  gstAmount: number;
  /** What the student actually paid for this item = itemPrice − coupon + GST. */
  paid: number;
}

/**
 * What a student actually paid for ONE item of an order, so a refund can give
 * back exactly that — never the pre-coupon price, never more than was charged.
 *
 * Checkout stores `priceAtPurchase` at list price for courses but already net
 * of the coupon share for projects (see CheckoutService.createOrder), so the
 * two are handled differently. The coupon is spread across all items in
 * proportion to their list price, and GST is added on top of the discounted fee.
 */
export function computeRefundBreakdown(
  order: { subtotal: number; discountAmount: number; gstPercent: number },
  item: { priceAtPurchase: number; projectId: string | null },
): RefundBreakdown {
  const discountRatio = order.subtotal > 0 ? order.discountAmount / order.subtotal : 0;

  let itemPrice: number;
  let couponDiscount: number;
  if (item.projectId) {
    // Stored price is already discounted: stored = list × (1 − ratio).
    itemPrice =
      discountRatio < 1 ? round2(item.priceAtPurchase / (1 - discountRatio)) : item.priceAtPurchase;
    couponDiscount = round2(itemPrice - item.priceAtPurchase);
  } else {
    itemPrice = item.priceAtPurchase;
    couponDiscount = round2(item.priceAtPurchase * discountRatio);
  }

  const net = round2(itemPrice - couponDiscount);
  const gstAmount = round2((net * order.gstPercent) / 100);
  return { itemPrice, couponDiscount, gstAmount, paid: round2(net + gstAmount) };
}

/** Date by which a refund started at `from` should reach the student. */
export function estimateRefundBy(from: Date, etaDays: number): Date {
  return new Date(from.getTime() + etaDays * 24 * 60 * 60 * 1000);
}
