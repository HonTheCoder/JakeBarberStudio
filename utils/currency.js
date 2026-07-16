/**
 * currency.js — shared formatter for Philippine Peso.
 *
 * fmt(1234)        → "₱1,234.00"
 * fmt(1234, true)  → "₱1.2k"  (compact, for chart axis labels)
 */
export const CURRENCY_SYMBOL = "₱";

/**
 * Format a number as Philippine Peso with exactly 2 decimal places.
 * Uses Intl.NumberFormat so thousands separators are locale-correct.
 */
export const fmt = (n, compact = false) => {
  const num = Number(n) || 0;
  if (compact) {
    if (num >= 1_000_000) return `${CURRENCY_SYMBOL}${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000)     return `${CURRENCY_SYMBOL}${(num / 1_000).toFixed(1)}k`;
    return `${CURRENCY_SYMBOL}${num.toFixed(2)}`;
  }
  // ₱#,##0.00 — always 2 decimal places, comma thousands separator
  return `${CURRENCY_SYMBOL}${num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Parse a PHP monetary string or raw number to a precise float.
 * Strips ₱, $, commas, spaces. Returns 0 on invalid input.
 */
export const toNum = v =>
  parseFloat(String(v ?? "0").replace(/[₱$,\s]/g, "")) || 0;

/**
 * Round a PHP amount to exactly 2 decimal places using banker-safe
 * Number.EPSILON offset to avoid floating-point drift.
 * e.g. phpRound(1234.565) → 1234.57
 */
export const phpRound = (n) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Barber experience tiers and their default commission split (barber's %
 * of gross). An admin can override the default per-barber via a custom
 * `splitPercent` stored on the stylist record (see Barber Splits feature).
 */
export const BARBER_TIERS = ["Junior", "Senior", "Head"];

export const TIER_DEFAULT_SPLIT = { Junior: 50, Senior: 60, Head: 70 };

/**
 * Compute barber and admin cuts for a given gross amount.
 * Returns { grossAmount, barberCut, adminCut, splitPercent } all as numbers (2dp).
 *
 * `barber` accepts either:
 *   - an object: { isAdmin, tier, splitPercent } — the modern shape, driven by
 *     the stylist's saved tier and/or custom split percentage (Barber Splits).
 *   - a legacy plain string (old call sites): "admin", or a role/job title
 *     like "Senior Barber" — kept working via a substring match so nothing
 *     that passed a string before breaks.
 *
 * Resolution order for the barber's %: explicit splitPercent > tier default > 50%.
 */
export const computeCuts = (grossAmount, barber = {}) => {
  const gross = phpRound(Number(grossAmount) || 0);

  const info = typeof barber === "string"
    ? {
        isAdmin: barber.toLowerCase() === "admin",
        tier: barber.toLowerCase().includes("head") ? "Head"
            : barber.toLowerCase().includes("senior") ? "Senior"
            : "Junior",
        splitPercent: null,
      }
    : (barber || {});

  // Admin role → 100% of their own income goes to them (they're entering personal income)
  if (info.isAdmin) {
    return { grossAmount: gross, barberCut: gross, adminCut: 0, splitPercent: 100 };
  }

  const hasCustomSplit = info.splitPercent != null && info.splitPercent !== "" && !isNaN(Number(info.splitPercent));
  const pct = hasCustomSplit
    ? Math.min(100, Math.max(0, Number(info.splitPercent)))
    : (TIER_DEFAULT_SPLIT[info.tier] ?? 50);

  const barberCut = phpRound(gross * (pct / 100));
  const adminCut  = phpRound(gross - barberCut); // subtraction prevents centavo drift
  return { grossAmount: gross, barberCut, adminCut, splitPercent: pct };
};

/** Parse a Firestore Timestamp, ISO string, or Date to a JS Date. Returns null on failure. */
export const parseDate = str => {
  if (!str) return null;
  if (str?.toDate) return str.toDate();
  const d = new Date(str);
  return isNaN(d) ? null : d;
};