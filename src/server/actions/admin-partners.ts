"use server";

import { revalidatePath } from "next/cache";
import type { VerificationStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { notifyMany } from "@/lib/notifications";
import { partnerStaffUserIds } from "@/lib/payments/booking";
import { VERIFICATION_TYPE_LABELS } from "@/lib/constants";

import {
  auditAction,
  enumField,
  optionalNumber,
  requireAdmin,
  text,
} from "@/server/actions/admin-context";
import type { AdminActionState } from "@/components/admin/action-state";

const VERIFICATION_DECISIONS = ["VERIFIED", "REJECTED", "IN_REVIEW", "PENDING"] as const;
const PARTNER_VERIFICATION = ["UNVERIFIED", "PENDING", "IN_REVIEW", "VERIFIED", "REJECTED", "EXPIRED"] as const;
const PAYOUT_MODELS = ["PLATFORM_COLLECTED", "PARTNER_DIRECT", "HYBRID"] as const;

/** Overall partner verification decision. */
export async function setPartnerVerification(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin("partner.verify");
  const partnerId = text(formData, "partnerId");
  const status = enumField(formData, "status", PARTNER_VERIFICATION, "VERIFIED");
  const notes = text(formData, "notes");

  if (!partnerId) return { error: "Missing partner reference." };

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { id: true, businessName: true, verificationStatus: true, verifiedAt: true },
  });
  if (!partner) return { error: "Partner not found." };

  const verified = status === "VERIFIED";
  const before = { verificationStatus: partner.verificationStatus, verifiedAt: partner.verifiedAt };

  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      verificationStatus: status,
      verifiedAt: verified ? new Date() : null,
      verifiedById: verified ? admin.id : null,
    },
  });

  await auditAction(admin, {
    action: verified ? "PARTNER_VERIFIED" : "PARTNER_VERIFICATION_CHANGED",
    entityType: "Partner",
    entityId: partnerId,
    summary: `Set verification for ${partner.businessName} to ${status}${notes ? ` — ${notes}` : ""}`,
    before,
    after: { verificationStatus: status, verifiedAt: verified ? new Date().toISOString() : null, notes: notes || null },
  });

  const staff = await partnerStaffUserIds(partnerId, ["OWNER", "MANAGER"]);
  await notifyMany(staff, {
    type: "VERIFICATION_UPDATE",
    title: verified ? "Your partner account is verified" : "Partner verification update",
    body: verified
      ? `${partner.businessName} is now verified on RentOps.`
      : `Verification status for ${partner.businessName} is now ${status.toLowerCase().replace(/_/g, " ")}.${notes ? ` ${notes}` : ""}`,
    channels: ["IN_APP", "EMAIL"],
    data: { partnerId },
  });

  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${partnerId}`);
  revalidatePath("/admin/verification");
  return { success: `Partner marked ${status}.` };
}

/** Approve, reject or return a single partner document. */
export async function reviewPartnerDocument(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin("partner.verify");
  const documentId = text(formData, "documentId");
  const decision = enumField(formData, "decision", VERIFICATION_DECISIONS, "VERIFIED");
  const notes = text(formData, "notes");

  if (!documentId) return { error: "Missing document reference." };
  if (decision === "REJECTED" && !notes) {
    return { error: "Add a note explaining why the document is being rejected." };
  }

  const document = await prisma.partnerDocument.findUnique({
    where: { id: documentId },
    include: { partner: { select: { id: true, businessName: true } } },
  });
  if (!document) return { error: "Document not found." };

  const before = { status: document.status, notes: document.notes };

  await prisma.partnerDocument.update({
    where: { id: documentId },
    data: { status: decision, notes: notes || document.notes, reviewedById: admin.id, reviewedAt: new Date() },
  });

  await auditAction(admin, {
    action: "PARTNER_DOCUMENT_REVIEWED",
    entityType: "PartnerDocument",
    entityId: documentId,
    summary: `${decision} document "${document.label ?? VERIFICATION_TYPE_LABELS[document.type]}" for ${document.partner.businessName}`,
    before,
    after: { status: decision, notes: notes || null },
  });

  const staff = await partnerStaffUserIds(document.partnerId, ["OWNER", "MANAGER"]);
  await notifyMany(staff, {
    type: "VERIFICATION_UPDATE",
    title: `Document ${decision.toLowerCase()}`,
    body: `${document.label ?? VERIFICATION_TYPE_LABELS[document.type]} was marked ${decision.toLowerCase().replace(/_/g, " ")}.${notes ? ` ${notes}` : ""}`,
    channels: ["IN_APP", "EMAIL"],
    data: { partnerId: document.partnerId },
  });

  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${document.partnerId}`);
  revalidatePath("/admin/verification");
  return { success: `Document ${decision}.` };
}

/** Commercial terms: commission override, payout model and settlement hold. */
export async function updatePartnerCommercials(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin("finance.manage");
  const partnerId = text(formData, "partnerId");
  const payoutModel = enumField(formData, "payoutModel", PAYOUT_MODELS, "PLATFORM_COLLECTED");
  const commissionRate = optionalNumber(formData, "commissionRate");
  const serviceFeeRate = optionalNumber(formData, "serviceFeeRate");
  const settlementHoldDays = optionalNumber(formData, "settlementHoldDays");

  if (!partnerId) return { error: "Missing partner reference." };
  if (commissionRate != null && (commissionRate < 0 || commissionRate > 100)) {
    return { error: "Commission override must be between 0 and 100 percent." };
  }
  if (serviceFeeRate != null && (serviceFeeRate < 0 || serviceFeeRate > 100)) {
    return { error: "Service fee rate must be between 0 and 100 percent." };
  }
  if (settlementHoldDays != null && (settlementHoldDays < 0 || settlementHoldDays > 365)) {
    return { error: "Settlement hold days must be between 0 and 365." };
  }

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { id: true, businessName: true, commissionRate: true, serviceFeeRate: true, payoutModel: true, settlementHoldDays: true },
  });
  if (!partner) return { error: "Partner not found." };

  const before = {
    commissionRate: partner.commissionRate,
    serviceFeeRate: partner.serviceFeeRate,
    payoutModel: partner.payoutModel,
    settlementHoldDays: partner.settlementHoldDays,
  };

  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      payoutModel,
      commissionRate,
      serviceFeeRate,
      settlementHoldDays,
    },
  });

  await auditAction(admin, {
    action: "PARTNER_COMMERCIALS_UPDATED",
    entityType: "Partner",
    entityId: partnerId,
    summary: `Updated commercial terms for ${partner.businessName} (${payoutModel})`,
    before,
    after: { payoutModel, commissionRate, serviceFeeRate, settlementHoldDays },
  });

  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${partnerId}`);
  return { success: "Commercial terms updated." };
}

/** Marks a partner's payout bank account as checked by RentOps. */
export async function verifyPartnerBankAccount(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin("finance.manage");
  const accountId = text(formData, "accountId");
  const verified = text(formData, "verified") !== "false";

  if (!accountId) return { error: "Missing bank account reference." };

  const account = await prisma.partnerBankAccount.findUnique({
    where: { id: accountId },
    include: { partner: { select: { id: true, businessName: true } } },
  });
  if (!account) return { error: "Bank account not found." };

  const before = { verifiedAt: account.verifiedAt };
  await prisma.partnerBankAccount.update({
    where: { id: accountId },
    data: { verifiedAt: verified ? new Date() : null, verifiedById: verified ? admin.id : null },
  });

  await auditAction(admin, {
    action: verified ? "PARTNER_BANK_VERIFIED" : "PARTNER_BANK_UNVERIFIED",
    entityType: "PartnerBankAccount",
    entityId: accountId,
    summary: `${verified ? "Verified" : "Removed verification for"} ${account.bankName} · ${account.accountNumber} (${account.partner.businessName})`,
    before,
    after: { verifiedAt: verified ? new Date().toISOString() : null },
  });

  revalidatePath(`/admin/partners/${account.partnerId}`);
  return { success: verified ? "Bank account marked verified." : "Bank account verification removed." };
}
