/**
 * Money handling.
 *
 * Every monetary amount in RentOps is a whole number of MINOR UNITS (kobo for
 * NGN): 150000 === NGN 1,500.00. All conversions and calculations in this module
 * round to whole minor units, so no value ever carries a fractional kobo.
 *
 * Columns are `double precision` rather than `integer` because Nigerian annual
 * leases comfortably exceed the int4 ceiling (int4 tops out at NGN 21,474,836.47,
 * while a Banana Island annual rent is an order of magnitude higher). Double
 * precision represents every integer exactly up to 2^53 — roughly 90 trillion
 * Naira in kobo — so this retains exact integer arithmetic while removing the cap.
 * The "whole minor units only" invariant is enforced here, at the single
 * conversion boundary all money passes through.
 */

export const MINOR_UNITS = 100;

export type Currency = string;

export const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;

const CURRENCY_FRACTION_DIGITS: Record<string, number> = {
  NGN: 2,
  USD: 2,
  GBP: 2,
  EUR: 2,
};

export function minorToMajor(minor: number, currency: Currency = "NGN") {
  const digits = CURRENCY_FRACTION_DIGITS[currency] ?? 2;
  return minor / Math.pow(10, digits);
}

export function majorToMinor(major: number, currency: Currency = "NGN") {
  const digits = CURRENCY_FRACTION_DIGITS[currency] ?? 2;
  return Math.round(major * Math.pow(10, digits));
}

/** Parses user input such as "1,500", "1500.50", "₦1500" into minor units. */
export function parseToMinor(input: string | number | null | undefined, currency: Currency = "NGN") {
  if (input === null || input === undefined || input === "") return 0;
  const raw = typeof input === "number" ? input.toString() : input;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  return majorToMinor(value, currency);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "\u20A6",
  USD: "$",
  GBP: "\u00A3",
  EUR: "\u20AC",
};

/**
 * Deterministic currency formatting.
 *
 * Grouping uses the `en-US` locale on both server and client so rendered output
 * is byte-identical and never triggers a hydration mismatch; the currency symbol
 * is applied from a fixed map.
 */
export function formatMoney(minor: number, currency: Currency = "NGN", options?: { compact?: boolean }) {
  const negative = minor < 0;
  const major = Math.abs(minorToMajor(minor, currency));
  const digits = options?.compact ? 0 : (CURRENCY_FRACTION_DIGITS[currency] ?? 2);
  const grouped = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(major);
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${negative ? "-" : ""}${symbol}${grouped}`;
}

export function formatMoneyPlain(minor: number, currency: Currency = "NGN") {
  return formatMoney(minor, currency, { compact: true });
}

/** Applies a percentage (e.g. 12.5) to a minor-unit amount, rounding to kobo. */
export function applyPercent(minor: number, percent: number) {
  return Math.round((minor * percent) / 100);
}

export function sumMinor(values: number[]) {
  return values.reduce((total, value) => total + Math.round(value), 0);
}

export const ZERO = 0;
