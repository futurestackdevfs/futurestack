import { computeRefundBreakdown, estimateRefundBy } from './refund-amount.util';

describe('computeRefundBreakdown', () => {
  it('course: list price − coupon share + GST', () => {
    const b = computeRefundBreakdown(
      { subtotal: 5000, discountAmount: 1000, gstPercent: 18 },
      { priceAtPurchase: 5000, projectId: null },
    );
    expect(b).toEqual({ itemPrice: 5000, couponDiscount: 1000, gstAmount: 720, paid: 4720 });
  });

  it('splits the coupon across items in proportion to list price', () => {
    // ₹3000 + ₹1000 order, ₹400 coupon → course carries ₹300, GST 0
    const b = computeRefundBreakdown(
      { subtotal: 4000, discountAmount: 400, gstPercent: 0 },
      { priceAtPurchase: 3000, projectId: null },
    );
    expect(b.couponDiscount).toBe(300);
    expect(b.paid).toBe(2700);
  });

  it('project: stored price is already net of the coupon, so it is not discounted twice', () => {
    // ₹1000 project stored as ₹900 after a 10% coupon share (subtotal 4000, discount 400)
    const b = computeRefundBreakdown(
      { subtotal: 4000, discountAmount: 400, gstPercent: 18 },
      { priceAtPurchase: 900, projectId: '__spec__project' },
    );
    expect(b).toEqual({ itemPrice: 1000, couponDiscount: 100, gstAmount: 162, paid: 1062 });
  });

  it('no coupon, no GST → paid equals the price', () => {
    const b = computeRefundBreakdown(
      { subtotal: 999, discountAmount: 0, gstPercent: 0 },
      { priceAtPurchase: 999, projectId: null },
    );
    expect(b.paid).toBe(999);
    expect(b.couponDiscount).toBe(0);
  });
});

describe('estimateRefundBy', () => {
  it('adds the configured number of days', () => {
    const d = estimateRefundBy(new Date('2026-10-01T00:00:00Z'), 7);
    expect(d.toISOString()).toBe('2026-10-08T00:00:00.000Z');
  });
});
