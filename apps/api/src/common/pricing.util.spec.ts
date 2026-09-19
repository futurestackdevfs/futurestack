import { Currency } from '@prisma/client';
import { gstPercentFor, resolveItemOriginalPrice, resolveItemPrice, round2 } from './pricing.util';

describe('pricing.util', () => {
  describe('round2', () => {
    it('rounds to 2 decimal places', () => {
      expect(round2(19.995)).toBe(20);
      expect(round2(19.994)).toBe(19.99);
    });

    it('returns 0 for non-finite input instead of NaN/Infinity leaking into a price', () => {
      expect(round2(NaN)).toBe(0);
      expect(round2(Infinity)).toBe(0);
    });
  });

  describe('resolveItemPrice', () => {
    it('uses the rupee price directly for INR', () => {
      expect(resolveItemPrice(Currency.INR, 4999, 59, 84)).toBe(4999);
    });

    it('uses the admin-set USD price when present, ignoring the conversion rate', () => {
      expect(resolveItemPrice(Currency.USD, 4999, 59, 84)).toBe(59);
    });

    it('falls back to converting INR at usdRate, rounded UP, when priceUsd is missing', () => {
      // 4999 / 84 = 59.51... -> ceil -> 60
      expect(resolveItemPrice(Currency.USD, 4999, null, 84)).toBe(60);
    });

    it('never undercharges: fallback conversion always rounds up, not to nearest', () => {
      // 8400 / 84 = exactly 100 -> should stay 100, not drift down
      expect(resolveItemPrice(Currency.USD, 8400, null, 84)).toBe(100);
      // 8401 / 84 = 100.01 -> ceil -> 101
      expect(resolveItemPrice(Currency.USD, 8401, null, 84)).toBe(101);
    });

    it('uses the built-in 84 fallback rate if usdRate is 0/invalid', () => {
      expect(resolveItemPrice(Currency.USD, 8400, null, 0)).toBe(100);
    });

    it('treats a free (0 or negative) INR price as free in USD too', () => {
      expect(resolveItemPrice(Currency.USD, 0, null, 84)).toBe(0);
      expect(resolveItemPrice(Currency.USD, -50, null, 84)).toBe(0);
    });
  });

  describe('resolveItemOriginalPrice', () => {
    it('returns null when there is no original/strikethrough price at all', () => {
      expect(resolveItemOriginalPrice(Currency.INR, null, null, 84)).toBeNull();
      expect(resolveItemOriginalPrice(Currency.USD, null, null, 84)).toBeNull();
    });

    it('converts an INR-only original price to USD using the fallback rate constant', () => {
      // FALLBACK_USD_RATE is 95 internally when usdRate itself is invalid
      expect(resolveItemOriginalPrice(Currency.USD, 9500, null, 0)).toBe(100);
    });
  });

  describe('gstPercentFor', () => {
    it('uses the INR GST rate for INR orders', () => {
      expect(gstPercentFor(Currency.INR, 18, 0)).toBe(18);
    });

    it('is zero-rated by default for USD (export of services)', () => {
      expect(gstPercentFor(Currency.USD, 18, 0)).toBe(0);
    });

    it('clamps an absurd admin-entered percent at 100', () => {
      expect(gstPercentFor(Currency.INR, 250, 0)).toBe(100);
    });

    it('treats a negative or non-finite percent as 0 rather than throwing', () => {
      expect(gstPercentFor(Currency.INR, -5, 0)).toBe(0);
      expect(gstPercentFor(Currency.INR, NaN, 0)).toBe(0);
    });
  });
});
