import { requirePlatformStaff, type SessionUser } from "@/lib/auth/session";
import type { PlatformPermission } from "@/lib/auth/rbac";
import { recordAudit } from "@/lib/audit";

/**
 * Shared plumbing for admin server actions.
 *
 * Not a `"use server"` module on purpose: it exports synchronous parsing
 * helpers alongside async guards, and every entry point re-derives the acting
 * staff member's authority from the session rather than trusting form input.
 */

/** Re-checks platform staff status and, when given, a specific permission. */
export async function requireAdmin(permission?: PlatformPermission): Promise<SessionUser> {
  return requirePlatformStaff(permission);
}

export async function auditAction(
  admin: SessionUser,
  input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    before?: unknown;
    after?: unknown;
  },
) {
  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.systemRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    summary: input.summary,
    before: input.before ?? null,
    after: input.after ?? null,
  });
}

/* -------------------------------------------------------------------------- */
/* Form parsing                                                                */
/* -------------------------------------------------------------------------- */

export function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value === "" ? null : value;
}

export function intField(formData: FormData, key: string, fallback = 0) {
  const raw = text(formData, key);
  if (raw === "") return fallback;
  const parsed = Number.parseInt(raw.replace(/[^0-9-]/g, ""), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function optionalInt(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (raw === "") return null;
  const parsed = Number.parseInt(raw.replace(/[^0-9-]/g, ""), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Money entered in naira, stored in kobo (minor units). */
export function moneyField(formData: FormData, key: string, fallback = 0) {
  const raw = text(formData, key);
  if (raw === "") return fallback;
  const parsed = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(parsed)) return fallback;
  return Math.round(parsed * 100);
}

export function optionalMoney(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (raw === "") return null;
  return moneyField(formData, key, 0);
}

export function numberField(formData: FormData, key: string, fallback = 0) {
  const raw = text(formData, key);
  if (raw === "") return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function optionalNumber(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (raw === "") return null;
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

export function boolField(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1" || value === "yes";
}

export function dateField(formData: FormData, key: string): Date | null {
  const raw = text(formData, key);
  if (!raw) return null;
  const parsed = new Date(raw.includes("T") ? raw : `${raw}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Strict yyyy-mm-dd calendar date (UTC midnight) used by booking data. */
export function calendarDate(formData: FormData, key: string): Date | null {
  const raw = text(formData, key);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function enumField<T extends string>(
  formData: FormData,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = text(formData, key);
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function stringList(formData: FormData, key: string): string[] {
  const raw = text(formData, key);
  return raw
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
}
