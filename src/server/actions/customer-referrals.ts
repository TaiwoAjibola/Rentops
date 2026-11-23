"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { uniqueSuffix } from "@/lib/utils";
import { notify } from "@/lib/notifications";

export type CustomerActionState = { error?: string; success?: string } | null;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Every customer needs a shareable code; older accounts may predate it. */
async function referralCode(userId: string, existing: string | null) {
  if (existing) return existing;
  const code = `RT-${uniqueSuffix(8)}`;
  await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
  return code;
}

export async function inviteReferral(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const user = await requireUser("/account/referrals");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim();

  if (!EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address to invite." };
  if (email === user.email.toLowerCase()) return { error: "You cannot invite yourself." };

  const code = await referralCode(user.id, user.referralCode);

  const duplicate = await prisma.referral.findFirst({
    where: { referrerId: user.id, referredEmail: email },
  });
  if (duplicate) return { error: "You have already invited this email address." };

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    return { error: "That email already has a RentOps account, so there is nothing to invite." };
  }

  await prisma.referral.create({
    data: {
      code,
      referrerId: user.id,
      referredEmail: email,
      status: "PENDING",
    },
  });

  // Delivery is handled by the notification driver once a provider is set up;
  // the invitation itself is recorded either way.
  await notify({
    userId: user.id,
    type: "GENERAL",
    title: `Invitation sent to ${email}`,
    body: message
      ? `We recorded your note: "${message.slice(0, 120)}".`
      : "Share your link directly for the fastest results — the reward tracks either way.",
    channels: ["IN_APP"],
  });

  revalidatePath("/account/referrals");
  revalidatePath("/account");
  return { success: `Invitation recorded for ${email}. Share your link directly too.` };
}
