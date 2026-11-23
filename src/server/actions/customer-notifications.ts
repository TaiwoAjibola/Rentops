"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { markAllRead } from "@/lib/notifications";

export type CustomerActionState = { error?: string; success?: string } | null;

export async function markNotificationRead(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/notifications");

  const id = String(formData.get("notificationId") ?? "").trim();
  if (!id) return { error: "Notification not found." };

  // Scoped to the session user: nobody can mark another account's notice read.
  const result = await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date(), status: "READ" },
  });
  if (result.count === 0) return { error: "That notification is already read." };

  revalidatePath("/account/notifications");
  revalidatePath("/account");
  return { success: "Marked as read." };
}

export async function markAllNotificationsRead(
  _state: CustomerActionState,
  _formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/notifications");
  await markAllRead(user.id);

  revalidatePath("/account/notifications");
  revalidatePath("/account");
  return { success: "All notifications marked as read." };
}
