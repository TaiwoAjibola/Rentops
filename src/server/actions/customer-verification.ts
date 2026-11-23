"use server";

import { revalidatePath } from "next/cache";
import type { VerificationType } from "@prisma/client";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { storeUpload, ALLOWED_DOC_TYPES } from "@/lib/storage";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";

export type CustomerActionState = { error?: string; success?: string } | null;

const MAX_SIZE = 10 * 1024 * 1024;

function asFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

/**
 * Identity verification for guests. Documents are stored through the platform's
 * storage driver and recorded as VerificationRecords for review; nothing is
 * auto-approved.
 */
export async function submitCustomerVerification(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/verification");

  const idType = String(formData.get("idType") ?? "").trim();
  const idNumber = String(formData.get("idNumber") ?? "").trim();
  const addressLine = String(formData.get("addressLine") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const backgroundConsent = formData.get("backgroundConsent") === "on";

  if (!idType) return { error: "Choose the type of ID you are submitting." };
  if (idNumber.length < 5) return { error: "Enter the number on your ID document." };

  const identityFile = asFile(formData.get("identityDocument"));
  if (!identityFile) return { error: "Attach a photo or scan of your ID document." };
  if (identityFile.size > MAX_SIZE) return { error: "Each document must be 10MB or smaller." };

  const uploaded: { type: VerificationType; url: string; label: string }[] = [];

  try {
    const stored = await storeUpload(identityFile, "verification/customers", {
      resourceType: ALLOWED_DOC_TYPES.includes(identityFile.type) ? "raw" : "image",
    });
    uploaded.push({ type: "IDENTITY", url: stored.url, label: "IDENTITY" });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "We could not store your document." };
  }

  const addressFile = asFile(formData.get("addressDocument"));
  if (addressFile) {
    try {
      const stored = await storeUpload(addressFile, "verification/customers", {
        resourceType: ALLOWED_DOC_TYPES.includes(addressFile.type) ? "raw" : "image",
      });
      uploaded.push({ type: "ADDRESS", url: stored.url, label: "ADDRESS" });
    } catch (error) {
      return { error: error instanceof Error ? error.message : "We could not store your address document." };
    }
  }

  const background: VerificationType[] = backgroundConsent ? ["BACKGROUND"] : [];

  await prisma.$transaction(async (tx) => {
    for (const entry of uploaded) {
      // A re-submission supersedes the previous record of the same type.
      await tx.verificationRecord.updateMany({
        where: { userId: user.id, subjectType: "USER", type: entry.type, status: { in: ["PENDING", "REJECTED", "EXPIRED"] } },
        data: { status: "EXPIRED" },
      });
      await tx.verificationRecord.create({
        data: {
          subjectType: "USER",
          userId: user.id,
          type: entry.type,
          status: "PENDING",
          documentUrl: entry.url,
          submittedAt: new Date(),
        },
      });
    }

    for (const type of background) {
      const existing = await tx.verificationRecord.findFirst({
        where: { userId: user.id, subjectType: "USER", type, status: { in: ["PENDING", "IN_REVIEW", "VERIFIED"] } },
      });
      if (!existing) {
        await tx.verificationRecord.create({
          data: {
            subjectType: "USER",
            userId: user.id,
            type,
            status: "PENDING",
            submittedAt: new Date(),
            notes: "Guest consented to a background check.",
          },
        });
      }
    }

    await tx.customerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        idType,
        idNumber,
        verificationStatus: "PENDING",
        ...(addressLine ? { addressLine } : {}),
        ...(city ? { city } : {}),
        ...(state ? { state } : {}),
      },
      update: {
        idType,
        idNumber,
        verificationStatus: "PENDING",
        ...(addressLine ? { addressLine } : {}),
        ...(city ? { city } : {}),
        ...(state ? { state } : {}),
      },
    });
  });

  await recordAudit({
    actorId: user.id,
    action: "CUSTOMER_VERIFICATION_SUBMITTED",
    entityType: "User",
    entityId: user.id,
    summary: `Verification submitted (${idType})`,
    after: { types: [...uploaded.map((entry) => entry.type), ...background] },
  });

  await notify({
    userId: user.id,
    type: "VERIFICATION_UPDATE",
    title: "Verification received",
    body: "Thanks — our team is reviewing your documents. This usually takes a few hours.",
    channels: ["IN_APP", "EMAIL"],
  });

  revalidatePath("/account/verification");
  revalidatePath("/account");
  return { success: "Documents submitted. We will update you as soon as the review is complete." };
}
