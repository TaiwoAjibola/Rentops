/**
 * Date helpers.
 *
 * Booking dates in RentOps are calendar dates, never instants. Every property
 * date is normalised to 00:00:00 UTC so that availability maths is immune to
 * server timezone drift.
 */

const MS_PER_DAY = 86_400_000;

export function toUtcDate(date: Date | string): Date {
  if (date instanceof Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateInput(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : toUtcDate(input);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function addMonthsUtc(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY));
}

export function daysBetween(start: Date, end: Date): number {
  return nightsBetween(start, end);
}

export function eachDate(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  for (let cursor = start; cursor < end; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

export function eachMonthStart(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor < end) {
    months.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function isWeekendNight(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 5 || day === 6; // Friday, Saturday
}

/** 0 = Sunday … 6 = Saturday, matching the platform's accepted-check-in config. */
export function utcDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function containsDate(start: Date, end: Date, date: Date): boolean {
  return date >= start && date < end;
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const value = typeof date === "string" ? parseDateInput(date) : date;
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  }).format(value);
}

export function formatDateShort(date: Date | string): string {
  return formatDate(date, { day: "numeric", month: "short" });
}

export function formatDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function relativeTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function startOfTodayUtc(): Date {
  return toUtcDate(new Date());
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function addUtcMonths(date: Date, months: number): Date {
  return addMonthsUtc(date, months);
}

/** Human stay-length label, e.g. "5 nights", "2 months", "1 year". */
export function describeDuration(nights: number): string {
  if (nights <= 0) return "0 nights";
  if (nights >= 730) {
    const years = Math.floor(nights / 365);
    return `${years} year${years > 1 ? "s" : ""}`;
  }
  if (nights >= 60) {
    const months = Math.round(nights / 30);
    return `${months} months`;
  }
  if (nights % 7 === 0 && nights >= 7) {
    const weeks = nights / 7;
    return `${weeks} week${weeks > 1 ? "s" : ""}`;
  }
  return `${nights} night${nights > 1 ? "s" : ""}`;
}
