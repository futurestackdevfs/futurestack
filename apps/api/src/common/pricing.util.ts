import { Currency } from '@prisma/client';

/**
 * Last-resort INR-per-USD guard, hit ONLY if `PaymentSettings.usdRate` is
 * somehow missing/invalid. The operative rate lives in PaymentSettings and is
 * edited in the admin panel (Payment Settings → Fees & Tax) — this is not a
 * config knob, don't tune it here.
 */
const FALLBACK_USD_RATE = 95;

/** Round to 2 decimal places without float drift. Non-finite input → 0. */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** A price is only usable if it is a finite number greater than zero. */
function positive(n: number | null | undefined): number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Resolves the price to charge for a catalog item in the requested currency.
 *
 * INR always uses the item's rupee price. USD uses the admin-set `priceUsd`
 * when present; otherwise it falls back to converting the rupee price at the
 * admin-configured `usdRate` (INR per 1 USD) and rounding UP to a whole dollar
 * so the fallback never undercharges.
 */
export function resolveItemPrice(
  currency: Currency,
  inr: number,
  usd: number | null | undefined,
  usdRate: number,
): number {
  const inrPrice = positive(inr);
  if (currency === Currency.INR) return round2(inrPrice);
  const usdPrice = positive(usd);
  if (usdPrice > 0) return round2(usdPrice);
  if (inrPrice === 0) return 0;
  const rate = positive(usdRate) || 84;
  return Math.max(1, Math.ceil(inrPrice / rate));
}

/** Same as {@link resolveItemPrice} but for the optional list/strikethrough price. */
export function resolveItemOriginalPrice(
  currency: Currency,
  inrOriginal: number | null | undefined,
  usdOriginal: number | null | undefined,
  usdRate: number,
): number | null {
  const inrOrig = positive(inrOriginal);
  if (currency === Currency.INR) return inrOrig > 0 ? round2(inrOrig) : null;
  const usdOrig = positive(usdOriginal);
  if (usdOrig > 0) return round2(usdOrig);
  if (inrOrig > 0) {
    const rate = positive(usdRate) || FALLBACK_USD_RATE;
    return Math.max(1, Math.ceil(inrOrig / rate));
  }
  return null;
}

/** GST percent for an order in the given currency. USD = export, zero-rated by default. */
export function gstPercentFor(
  currency: Currency,
  gstPercentInr: number,
  gstPercentUsd: number,
): number {
  const pct = currency === Currency.USD ? gstPercentUsd : gstPercentInr;
  return Number.isFinite(pct) && pct >= 0 ? Math.min(pct, 100) : 0;
}
