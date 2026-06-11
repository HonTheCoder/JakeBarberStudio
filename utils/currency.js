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

/** Strip ₱ / $ / commas and parse to float. Returns 0 on invalid input. */
export const toNum = v => parseFloat(String(v ?? "0").replace(/[₱$,]/g, "")) || 0;

/** Parse a Firestore Timestamp, ISO string, or Date to a JS Date. Returns null on failure. */
export const parseDate = str => {
  if (!str) return null;
  if (str?.toDate) return str.toDate();
  const d = new Date(str);
  return isNaN(d) ? null : d;
};