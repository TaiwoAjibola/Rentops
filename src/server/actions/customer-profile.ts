"use server";

import { revalidatePath } from "next/cache";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseDateInput } from "@/lib/dates";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";

export type CustomerActionState = { error?: string; success?: string } | null;

/** Extended profile fields held on `CustomerProfile`. */
export async function updateProfileDetails(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/profile");

  const nationality = String(formData.get("nationality") ?? "").trim();
  const addressLine = String(formData.get("addressLine") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const emergencyContactName = String(formData.get("emergencyContactName") ?? "").trim();
  const emergencyContactPhone = String(formData.get("emergencyContactPhone") ?? "").trim();

  const dateOfBirthRaw = String(formData.get("dateOfBirth") ?? "").trim();
  const dateOfBirth = dateOfBirthRaw ? parseDateInput(dateOfBirthRaw) : null;
  if (dateOfBirthRaw && !dateOfBirth) return { error: "Enter your date of birth as a real date." };
  if (dateOfBirth && dateOfBirth > new Date()) return { error: "Date of birth cannot be in the future." };

  const values = {
    nationality: nationality || null,
    addressLine: addressLine || null,
    city: city || null,
    state: state || null,
    country: country || null,
    emergencyContactName: emergencyContactName || null,
    emergencyContactPhone: emergencyContactPhone || null,
    dateOfBirth,
  };

  await prisma.customerProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...values },
    update: values,
  });

  revalidatePath("/account/profile");
  return { success: "Profile details saved." };
}

/** Verifies the current password before replacing it. */
export async function changePassword(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/profile");

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current) return { error: "Enter your current password." };
  if (next.length < 8) return { error: "Your new password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords do not match." };
  if (next === current) return { error: "Choose a password you have not used before." };

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!account) return { error: "Account not found." };

  const valid = await verifyPassword(current, account.passwordHash);
  if (!valid) return { error: "Your current password is incorrect." };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });

  await recordAudit({
    actorId: user.id,
    action: "CUSTOMER_PASSWORD_CHANGED",
    entityType: "User",
    entityId: user.id,
    summary: "Password changed from the account area",
  });

  await notify({
    userId: user.id,
    type: "GENERAL",
    title: "Your password was changed",
    body: "If this was not you, contact support immediately so we can secure your account.",
    channels: ["IN_APP", "EMAIL"],
  });

  revalidatePath("/account/profile");
  return { success: "Password updated." };
}

/** Notification channel preferences (NotificationPreference row). */
export async function saveNotificationPreferences(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/profile");

  const channels = ["inApp", "email", "sms", "whatsapp"] as const;
  const values = channels.map((channel) => formData.get(channel) === "on");

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      inApp: values[0],
      email: values[1],
      sms: values[2],
      whatsapp: values[3],
    },
    update: {
      inApp: values[0],
      email: values[1],
      sms: values[2],
      whatsapp: values[3],
    },
  });

  revalidatePath("/account/profile");
  revalidatePath("/account/notifications");
  return { success: "Notification preferences saved." };
}
