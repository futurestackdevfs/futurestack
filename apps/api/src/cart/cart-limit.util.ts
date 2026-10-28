// Last-resort guard for a missing/invalid setting — NOT a config knob. The live
// limit is PaymentSettings.maxCartItems, editable in the admin panel.
const FALLBACK_MAX_CART_ITEMS = 5;

export function resolveMaxCartItems(settings: { maxCartItems?: number | null }): number {
  const n = settings.maxCartItems;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : FALLBACK_MAX_CART_ITEMS;
}

export function cartFullMessage(max: number): string {
  return `Your cart can hold at most ${max} ${max === 1 ? 'item' : 'items'}. Remove one to add another.`;
}
