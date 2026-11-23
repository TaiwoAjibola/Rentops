"use server";

import { revalidatePath } from "next/cache";
import type { PayoutModel } from "@prisma/client";

import type { PartnerActionState } from "@/components/partner/action-state";
import { bool, isEmail, lower, str } from "@/components/partner/guards";
import { requirePartnerContext, requirePartnerPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

/**
 * Settings actions for the partner portal.
 *
 * Everything here resolves the partner from the session membership — never from
 * form input — and every write is audited. The business profile and the payout
 * model are separate actions because they are separate decisions: the profile is
 * what guests and RentOps support see, the payout model determines who collects
 * money and therefore when settlements are created.
 */

const PAYOUT_MODELS: PayoutModel[] = ["PLATFORM_COLLECTED", "PARTNER_DIRECT", "HYBRID"];

function revalidateSettings() {
  revalidatePath("/partner/settings");
  revalidatePath("/partner", "layout");
}

export async function updatePartnerSettings(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("settings.manage");

  const businessName = str(formData, "businessName");
  const email = lower(formData, "email");
  const phone = str(formData, "phone");

  if (businessName.length < 2) return { error: "Enter the business name guests will recognise." };
  if (!isEmail(email)) return { error: "Enter a valid business email address." };
  if (phone.replace(/\D/g, "").length < 7) return { error: "Enter a phone number RentOps can reach you on." };

  const before = {
    businessName: partner.businessName,
    email: partner.email,
    phone: partner.phone,
    whatsapp: partner.whatsapp,
    addressLine: partner.addressLine,
    city: partner.city,
    state: partner.state,
    description: partner.description,
  };

  const after = {
    businessName,
    email,
    phone,
    whatsapp: str(formData, "whatsapp") || null,
    addressLine: str(formData, "addressLine") || null,
    city: str(formData, "city") || null,
    state: str(formData, "state") || null,
    description: str(formData, "description") || null,
  };

  await prisma.partner.update({ where: { id: partner.id }, data: after });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_SETTINGS_UPDATED",
    entityType: "Partner",
    entityId: partner.id,
    summary: "Business profile updated",
    before,
    after,
  });

  revalidateSettings();
  return { success: "Business profile updated." };
}

export async function updatePayoutSettings(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("settings.manage");

  const payoutModel = str(formData, "payoutModel") as PayoutModel;
  if (!PAYOUT_MODELS.includes(payoutModel)) return { error: "Choose how you want to be paid." };

  if (partner.payoutModel === payoutModel) {
    return { success: "That is already your payout model." };
  }

  await prisma.partner.update({ where: { id: partner.id }, data: { payoutModel } });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_PAYOUT_MODEL_UPDATED",
    entityType: "Partner",
    entityId: partner.id,
    summary: `Payout model changed to ${payoutModel.toLowerCase().replace(/_/g, " ")}`,
    before: { payoutModel: partner.payoutModel },
    after: { payoutModel },
  });

  revalidateSettings();
  return {
    success:
      payoutModel === "PARTNER_DIRECT"
        ? "Saved. You now collect payment directly and RentOps invoices its commission."
        : "Saved. Settlement and payout screens reflect this immediately.",
  };
}

/** Notification channels for the acting member (not the whole organisation). */
export async function saveNotificationSettings(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { user } = await requirePartnerContext();

  const prefs = {
    inApp: bool(formData, "inApp"),
    email: bool(formData, "email"),
    sms: bool(formData, "sms"),
    whatsapp: bool(formData, "whatsapp"),
  };

  // A partner who switches everything off still needs in-app delivery for
  // payout, verification and dispute notices — those are not marketing.
  const channels = { ...prefs, inApp: true };

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...channels },
    update: channels,
  });

  revalidatePath("/partner/settings");
  revalidatePath("/partner", "layout");
  return { success: "Notification preferences saved." };
}
