/**
 * currency.js — shared formatter for Philippine Peso.
 * Import `fmt` everywhere money is displayed so the symbol lives in one place.
 *
 * fmt(1234)      → "₱1,234"
 * fmt(1234, true) → "₱1.2k"  (compact, for chart axis labels)
 */
export const CURRENCY_SYMBOL = "₱";

export const fmt = (n, compact = false) => {
  const num = Number(n) || 0;
  if (compact) {
    if (num >= 1_000_000) return `${CURRENCY_SYMBOL}${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000)     return `${CURRENCY_SYMBOL}${(num / 1_000).toFixed(1)}k`;
    return `${CURRENCY_SYMBOL}${num}`;
  }
  return `${CURRENCY_SYMBOL}${num.toLocaleString()}`;
};