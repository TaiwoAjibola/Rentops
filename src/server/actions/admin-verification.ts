"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { VERIFICATION_TYPE_LABELS } from "@/lib/constants";

import { auditAction, enumField, requireAdmin, text } from "@/server/actions/admin-context";
import type { AdminActionState } from "@/components/admin/action-state";

const DECISIONS = ["VERIFIED", "REJECTED", "IN_REVIEW", "PENDING"] as const;

/**
 * Triage action for a `VerificationRecord` (a customer, partner or property
 * check submitted through the verification pipeline).
 */
export async function reviewVerificationRecord(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin("partner.verify");
  const recordId = text(formData, "recordId");
  const decision = enumField(formData, "decision", DECISIONS, "VERIFIED");
  const notes = text(formData, "notes");

  if (!recordId) return { error: "Missing verification record." };
  if (decision === "REJECTED" && !notes) {
    return { error: "Add a note explaining why this check is being rejected." };
  }

  const record = await prisma.verificationRecord.findUnique({ where: { id: recordId } });
  if (!record) return { error: "Verification record not found." };

  const before = { status: record.status, notes: record.notes };

  await prisma.verificationRecord.update({
    where: { id: recordId },
    data: {
      status: decision,
      notes: notes || record.notes,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  await auditAction(admin, {
    action: "VERIFICATION_RECORD_REVIEWED",
    entityType: "VerificationRecord",
    entityId: recordId,
    summary: `${decision} ${VERIFICATION_TYPE_LABELS[record.type]} verification (${record.subjectType.toLowerCase()})`,
    before,
    after: { status: decision, notes: notes || null },
  });

  if (record.userId) {
    await notify({
      userId: record.userId,
      type: "VERIFICATION_UPDATE",
      title: "Verification update",
      body: `Your ${VERIFICATION_TYPE_LABELS[record.type].toLowerCase()} was marked ${decision.toLowerCase().replace(/_/g, " ")}.${notes ? ` ${notes}` : ""}`,
      channels: ["IN_APP", "EMAIL"],
      data: { verificationId: record.id },
    });
  }

  revalidatePath("/admin/verification");
  revalidatePath("/admin/users");
  if (record.userId) revalidatePath(`/admin/users/${record.userId}`);
  if (record.propertyId) revalidatePath(`/admin/properties/${record.propertyId}`);
  return { success: `Verification marked ${decision}.` };
}
