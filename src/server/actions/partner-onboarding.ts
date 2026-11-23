"use server";

import { revalidatePath } from "next/cache";
import type { VerificationType } from "@prisma/client";

import type { PartnerActionState } from "@/components/partner/action-state";
import { fileOf, str } from "@/components/partner/guards";
import { generateToken, hashToken, requirePartnerContext, requirePartnerPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";
import { storeUpload } from "@/lib/storage";

/**
 * Onboarding actions.
 *
 * Steps are never ticked by a flag the partner sets themselves — each action
 * writes the underlying record and the checklist re-derives completion from the
 * database.
 */

const DOCUMENT_TYPES: VerificationType[] = ["IDENTITY", "BUSINESS", "OWNERSHIP", "ADDRESS"];

const DOCUMENT_LABELS: Record<VerificationType, string> = {
  IDENTITY: "Identity document",
  BUSINESS: "Business registration",
  OWNERSHIP: "Proof of ownership or listing authority",
  ADDRESS: "Proof of business address",
  BACKGROUND: "Background check",
  LOCATION: "Location confirmation",
  MEDIA: "Media review",
  INSPECTION: "Property inspection",
};

function resourceTypeFor(file: File) {
  return file.type === "application/pdf" ? ("raw" as const) : ("image" as const);
}

async function advanceStep(
  partnerId: string,
  step: "ACCOUNT" | "CONTACT" | "DOCUMENTS" | "SETTLEMENT" | "PROPERTY",
) {
  const order = ["ACCOUNT", "CONTACT", "DOCUMENTS", "SETTLEMENT", "PROPERTY"];
  const current = await prisma.partner.findUnique({ where: { id: partnerId }, select: { onboardingStep: true } });
  if (!current) return;
  if (order.indexOf(step) > order.indexOf(current.onboardingStep)) {
    await prisma.partner.update({ where: { id: partnerId }, data: { onboardingStep: step } });
  }
}

export async function uploadPartnerDocument(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerContext();

  const type = str(formData, "type") as VerificationType;
  if (!DOCUMENT_TYPES.includes(type)) return { error: "Choose the type of document you are uploading." };

  const file = fileOf(formData, "file");
  if (!file) return { error: "Choose a file to upload." };

  let url: string;
  try {
    const stored = await storeUpload(file, `partners/${partner.slug}/documents`, {
      resourceType: resourceTypeFor(file),
    });
    url = stored.url;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "We could not store that file." };
  }

  await prisma.partnerDocument.create({
    data: {
      partnerId: partner.id,
      type,
      label: DOCUMENT_LABELS[type],
      fileUrl: url,
      status: "PENDING",
      uploadedById: user.id,
    },
  });

  // Submitting documents moves the partner into the manual review queue.
  if (partner.verificationStatus === "UNVERIFIED") {
    await prisma.partner.update({ where: { id: partner.id }, data: { verificationStatus: "PENDING" } });
  }

  await advanceStep(partner.id, "DOCUMENTS");

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_DOCUMENT_UPLOADED",
    entityType: "Partner",
    entityId: partner.id,
    summary: `${DOCUMENT_LABELS[type]} uploaded for verification review`,
    after: { type, fileUrl: url },
  });

  await notify({
    userId: user.id,
    type: "VERIFICATION_UPDATE",
    title: "Document received",
    body: `Your ${DOCUMENT_LABELS[type].toLowerCase()} was uploaded. RentOps reviews every document before payouts are released.`,
    channels: ["IN_APP"],
    data: { partnerId: partner.id },
  });

  revalidatePath("/partner/onboarding");
  revalidatePath("/partner/settings");
  revalidatePath("/partner");
  return { success: `${DOCUMENT_LABELS[type]} uploaded. Our reviews team will check it shortly.` };
}

/** Creates a real email-verification token for the acting operator. */
export async function requestContactVerification(
  _state: PartnerActionState,
  _formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerContext();
  if (user.emailVerifiedAt) return { success: "Your email address is already verified." };

  await prisma.emailVerificationToken.deleteMany({ where: { email: user.email } });
  const token = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      email: user.email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 48 * 3_600_000),
    },
  });

  await notify({
    userId: user.id,
    type: "VERIFICATION_UPDATE",
    title: "Confirm your email address",
    body: "Use the verification link we sent to confirm the email on your partner account.",
    channels: ["IN_APP", "EMAIL"],
    data: { partnerId: partner.id, verifyPath: `/partner/verify-email?token=${token}` },
  });

  revalidatePath("/partner/onboarding");
  return {
    success:
      "Verification link sent. If email delivery is not configured on this environment, the link is also in your RentOps notifications.",
  };
}

/** Consumes the token produced above. */
export async function confirmContactVerification(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const token = str(formData, "token");
  if (!token) return { error: "This verification link is missing its token." };

  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This verification link has expired or was already used." };
  }

  const user = await prisma.user.findUnique({ where: { email: record.email }, select: { id: true } });
  if (!user) return { error: "We could not match that link to an account." };

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await recordAudit({
    actorId: user.id,
    actorEmail: record.email,
    action: "PARTNER_CONTACT_VERIFIED",
    entityType: "User",
    entityId: user.id,
    summary: "Email address confirmed",
  });

  revalidatePath("/partner/onboarding");
  revalidatePath("/partner");
  return { success: "Email confirmed." };
}

// -----------------------------------------------------------------------------
// Settlement / bank details — finance-grade access only
// -----------------------------------------------------------------------------

export async function saveBankAccount(_state: PartnerActionState, formData: FormData): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("settlement.manage");

  const bankName = str(formData, "bankName");
  const accountNumber = str(formData, "accountNumber");
  const accountName = str(formData, "accountName");
  const bankCode = str(formData, "bankCode");
  const makePrimary = str(formData, "isPrimary") === "on" || Boolean(formData.get("isPrimary"));

  if (!bankName) return { error: "Enter the bank name." };
  if (!/^\d{10}$/.test(accountNumber)) return { error: "Account numbers must be 10 digits." };
  if (accountName.length < 3) return { error: "Enter the name on the account." };

  const existingCount = await prisma.partnerBankAccount.count({ where: { partnerId: partner.id } });

  const created = await prisma.partnerBankAccount.create({
    data: {
      partnerId: partner.id,
      bankName,
      bankCode: bankCode || null,
      accountNumber,
      accountName,
      currency: partner.defaultCurrency,
      isPrimary: existingCount === 0 ? true : makePrimary,
    },
  });

  if (created.isPrimary) {
    await prisma.partnerBankAccount.updateMany({
      where: { partnerId: partner.id, id: { not: created.id } },
      data: { isPrimary: false },
    });
  }

  await advanceStep(partner.id, "SETTLEMENT");

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_BANK_ACCOUNT_ADDED",
    entityType: "PartnerBankAccount",
    entityId: created.id,
    summary: `Payout account added at ${bankName}`,
    after: { bankName, accountNumber: accountNumber.slice(-4).padStart(10, "*"), accountName },
  });

  revalidatePath("/partner/onboarding");
  revalidatePath("/partner/bank-accounts");
  revalidatePath("/partner/settings");
  return { success: "Bank account saved. Payouts are released to your primary account." };
}

export async function setPrimaryBankAccount(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("settlement.manage");
  const id = str(formData, "accountId");
  if (!id) return { error: "Choose an account." };

  const account = await prisma.partnerBankAccount.findFirst({ where: { id, partnerId: partner.id } });
  if (!account) return { error: "That account is not on this partner profile." };

  await prisma.$transaction([
    prisma.partnerBankAccount.updateMany({
      where: { partnerId: partner.id, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.partnerBankAccount.update({ where: { id }, data: { isPrimary: true } }),
  ]);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_BANK_ACCOUNT_PRIMARY",
    entityType: "PartnerBankAccount",
    entityId: id,
    summary: `Primary payout account set to ${account.bankName}`,
  });

  revalidatePath("/partner/onboarding");
  revalidatePath("/partner/bank-accounts");
  return { success: "Primary payout account updated." };
}

export async function removeBankAccount(
  _state: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const { partner, user } = await requirePartnerPermission("settlement.manage");
  const id = str(formData, "accountId");

  const account = await prisma.partnerBankAccount.findFirst({ where: { id, partnerId: partner.id } });
  if (!account) return { error: "That account is not on this partner profile." };

  await prisma.partnerBankAccount.delete({ where: { id } });

  if (account.isPrimary) {
    const next = await prisma.partnerBankAccount.findFirst({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.partnerBankAccount.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "PARTNER_BANK_ACCOUNT_REMOVED",
    entityType: "PartnerBankAccount",
    entityId: id,
    summary: `Payout account removed (${account.bankName})`,
  });

  revalidatePath("/partner/bank-accounts");
  revalidatePath("/partner/onboarding");
  return { success: "Bank account removed." };
}
