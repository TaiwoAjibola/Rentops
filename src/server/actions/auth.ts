"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  generateToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "@/lib/auth/session";
import { slugify, uniqueSuffix } from "@/lib/utils";
import { notify } from "@/lib/notifications";

export type AuthState = { error?: string; success?: string } | null;

async function requestMeta() {
  const { headers } = await import("next/headers");
  const list = await headers();
  return {
    ipAddress: list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: list.get("user-agent") ?? null,
  };
}

function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") ? value : "/account";
}

export async function registerCustomer(_state: AuthState, formData: FormData): Promise<AuthState> {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const next = safeNext(formData.get("next"));

  if (!firstName || !lastName) return { error: "Please enter your first and last name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account already exists for this email address." };

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone: phone || null,
      passwordHash: await hashPassword(password),
      referralCode: `RT-${uniqueSuffix(8)}`,
      systemRole: "CUSTOMER",
      profile: { create: {} },
      notificationPrefs: { create: {} },
    },
  });

  const meta = await requestMeta();
  await createSession(user.id, meta);

  await notify({
    userId: user.id,
    type: "REGISTRATION",
    title: "Welcome to RentOps",
    body: "Your account is ready. Save properties, message partners and book accommodation in minutes.",
    channels: ["IN_APP"],
  });

  redirect(next);
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "No account found for that email address." };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { error: "Incorrect email or password." };
  if (user.status !== "ACTIVE") return { error: "This account has been suspended. Contact support." };

  const meta = await requestMeta();
  await createSession(user.id, meta);

  if (user.systemRole !== "CUSTOMER") redirect("/admin");

  // A property partner belongs in the partner portal, not the renter account.
  const membership = await prisma.partnerMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (membership) redirect("/partner");

  redirect(next === "/account" ? "/account" : next);
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordReset(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 2 * 3_600_000),
      },
    });
    // Delivery is handled by the notification driver when configured.
    await notify({
      userId: user.id,
      type: "PASSWORD_RESET",
      title: "Reset your RentOps password",
      body: "A password reset link was requested for your account.",
      channels: ["IN_APP"],
    });
  }

  return { success: "If an account exists for that email, a reset link has been sent." };
}

export async function resetPassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash: await hashPassword(password) },
  });
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

  redirect("/login?reset=1");
}

export async function updateCustomerProfile(_state: AuthState, formData: FormData): Promise<AuthState> {
  const { requireUser } = await import("@/lib/auth/session");
  const user = await requireUser();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();

  const data: Prisma.UserUpdateInput = {
    firstName: firstName || user.firstName,
    lastName: lastName || user.lastName,
    phone: phone || null,
    avatarUrl: avatarUrl || null,
  };

  await prisma.user.update({ where: { id: user.id }, data });
  return { success: "Profile updated." };
}

export async function ensureUniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const cleaned = slugify(base) || "property";
  let candidate = cleaned;
  let index = 2;
  while (await exists(candidate)) {
    candidate = `${cleaned}-${index++}`;
  }
  return candidate;
}
