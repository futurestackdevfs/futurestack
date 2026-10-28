export type PaymentMode = 'ONLINE' | 'OFFLINE';

/**
 * Online = a real Razorpay order (website checkout, or a sales "pay link").
 * Offline = cash / manually collected sale, which the sales console stores
 * with a `MANUAL-<id>` placeholder instead of a Razorpay order id.
 */
export function paymentModeOf(order: { razorpayOrderId: string }): PaymentMode {
  return order.razorpayOrderId.startsWith('MANUAL-') ? 'OFFLINE' : 'ONLINE';
}

const METHOD_LABELS: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  'net banking': 'Net Banking',
  wallet: 'Wallet',
  emi: 'EMI',
  cash: 'Cash',
  other: 'Other',
  test: 'Test payment',
  gift: 'Gift',
};

/** Human label for the stored method — Razorpay sends lowercase ("upi"), the
 *  sales console stores "UPI" / "Cash" / "Net Banking". */
export function paymentMethodLabel(method: string | null | undefined): string | null {
  const m = method?.trim();
  if (!m) return null;
  return METHOD_LABELS[m.toLowerCase()] ?? m.charAt(0).toUpperCase() + m.slice(1);
}
