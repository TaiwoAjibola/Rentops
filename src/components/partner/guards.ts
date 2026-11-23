import { prisma } from "@/lib/db";

/**
 * Server-side ownership guards for the partner portal.
 *
 * Every mutation re-checks that the row belongs to the partner resolved from the
 * session — never to an id taken from the client. A helper returning `null`
 * means "not yours or not found", and callers turn that into a form error so no
 * information leaks about another partner's records.
 */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export function lower(formData: FormData, key: string): string {
  return str(formData, key).toLowerCase();
}

export function bool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1" || value === "yes";
}

export function intOr(formData: FormData, key: string, fallback: number | null = null): number | null {
  const raw = str(formData, key);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function floatOr(formData: FormData, key: string, fallback: number | null = null): number | null {
  const raw = str(formData, key);
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function requiredInt(formData: FormData, key: string, fallback: number): number {
  return intOr(formData, key, fallback) ?? fallback;
}

export function fileOf(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}

/** Unique list of string values, used for multi-checkbox groups. */
export function stringList(formData: FormData, key: string): string[] {
  return Array.from(new Set(formData.getAll(key).map((value) => String(value).trim()).filter(Boolean)));
}

// -----------------------------------------------------------------------------
// Ownership
// -----------------------------------------------------------------------------

export async function ownedProperty(partnerId: string, propertyId: string) {
  return prisma.property.findFirst({ where: { id: propertyId, partnerId } });
}

export async function ownedUnit(partnerId: string, unitId: string) {
  return prisma.unit.findFirst({
    where: { id: unitId, property: { partnerId } },
    include: { property: { select: { id: true, name: true, currency: true } } },
  });
}

export async function ownedRoomCategory(partnerId: string, categoryId: string) {
  return prisma.roomCategory.findFirst({
    where: { id: categoryId, property: { partnerId } },
  });
}

export async function ownedReservation(partnerId: string, reference: string) {
  return prisma.reservation.findFirst({
    where: { reference, property: { partnerId } },
    include: { property: { select: { id: true, name: true, currency: true, partnerId: true } } },
  });
}

export async function ownedSettlement(partnerId: string, reference: string) {
  return prisma.settlement.findFirst({ where: { reference, partnerId } });
}

export async function ownedConversation(partnerId: string, conversationId: string) {
  return prisma.conversation.findFirst({ where: { id: conversationId, partnerId } });
}

export async function ownedBankAccount(partnerId: string, accountId: string) {
  return prisma.partnerBankAccount.findFirst({ where: { id: accountId, partnerId } });
}

export async function ownedSeasonalRate(partnerId: string, seasonalRateId: string) {
  return prisma.seasonalRate.findFirst({
    where: { id: seasonalRateId, unit: { property: { partnerId } } },
  });
}

export async function ownedPartnerMember(partnerId: string, memberId: string) {
  return prisma.partnerMember.findFirst({ where: { id: memberId, partnerId } });
}

export async function ownedInvitation(partnerId: string, invitationId: string) {
  return prisma.partnerInvitation.findFirst({ where: { id: invitationId, partnerId } });
}
