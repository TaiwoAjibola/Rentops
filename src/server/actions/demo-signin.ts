"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

/**
 * One-click sign-in for the MVP demo.
 *
 * Deliberately unauthenticated: it only ever signs you in as an existing seeded
 * account. This exists so the prototype can be explored without typing
 * credentials. It is a development convenience, NOT a security control — a
 * production deployment must remove it and use the normal `login` action.
 */

export async function signInAsDemo(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const requested = String(formData.get("next") ?? "");
  const next = requested.startsWith("/") ? requested : "/account";

  if (!email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/login?error=unknown-account");

  await createSession(user.id);

  // RentOps staff land in the control room; everyone else goes where they asked.
  if (user.systemRole !== "CUSTOMER") redirect("/admin");

  // Property partners land in the partner portal, renters in their account.
  const membership = await prisma.partnerMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (membership) redirect("/partner");

  redirect(next);
}
