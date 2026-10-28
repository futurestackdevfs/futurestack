/**
 * A "gift" is an enrollment an admin grants without taking payment. It is
 * recorded like any other purchase — a PAID order, an invoice — just for ₹0,
 * and tagged with a fixed code so it is obvious on the invoice and in reports.
 */
export const GIFT_CODE = 'GIFT';

/** Stored in Order.paymentMethod. */
export const GIFT_PAYMENT_METHOD = 'Gift';

/** Order.razorpayOrderId prefix. Starts with `MANUAL-`, so it counts as an offline order everywhere. */
const GIFT_ORDER_PREFIX = 'MANUAL-GIFT-';

export function giftOrderRef(orderId: string): string {
  return `${GIFT_ORDER_PREFIX}${orderId}`;
}

export function isGiftOrder(order: { razorpayOrderId: string }): boolean {
  return order.razorpayOrderId.startsWith(GIFT_ORDER_PREFIX);
}
