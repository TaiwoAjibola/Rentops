import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Partner, PartnerMember, SystemRole, User } from "@prisma/client";

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

// Re-exported so existing call sites can continue to import password helpers
// from the session module. (Kept separate so scripts can use them without
// pulling in `next/headers`.)
export { hashPassword, verifyPassword };
import {
  PLATFORM_STAFF_ROLES,
  hasPlatformPermission,
  resolvePartnerPermissions,
  type PartnerPermission,
  type PlatformPermission,
} from "@/lib/auth/rbac";

export const SESSION_COOKIE = "rentops_session";
export const ACTIVE_PARTNER_COOKIE = "rentops_partner";

const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? 720);
const SESSION_SECRET = process.env.SESSION_SECRET ?? "rentops-demo-session-secret";

// -----------------------------------------------------------------------------
// Passwords & tokens
// -----------------------------------------------------------------------------

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function signSessionValue(value: string) {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function createSessionToken(userId: string, expiresAt: Date) {
  const payload = `${userId}.${expiresAt.getTime()}`;
  return `${payload}.${signSessionValue(payload)}`;
}

function readSessionToken(token: string): { userId: string; expiresAt: Date } | null {
  const [userId, exp, sig, ...rest] = token.split(".");
  if (!userId || !exp || !sig || rest.length > 0) return null;
  const payload = `${userId}.${exp}`;
  if (signSessionValue(payload) !== sig) return null;
  const ms = Number(exp);
  if (!Number.isFinite(ms)) return null;
  const expiresAt = new Date(ms);
  if (expiresAt < new Date()) return null;
  return { userId, expiresAt };
}

// -----------------------------------------------------------------------------
// Session lifecycle
// -----------------------------------------------------------------------------

export async function createSession(userId: string, _context?: { ipAddress?: string | null; userAgent?: string | null }) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3_600_000);
  const token = createSessionToken(userId, expiresAt);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  try {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  } catch {
    // Demo/no-DB mode: best effort.
  }

  return token;
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ACTIVE_PARTNER_COOKIE);
}

export type SessionUser = User;

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const parsed = readSessionToken(token);
  if (!parsed) return null;

  const user = await prisma.user.findUnique({ where: { id: parsed.userId } });
  if (!user || (user as any).status !== "ACTIVE") return null;
  return user as SessionUser;
});

// -----------------------------------------------------------------------------
// Guards
// -----------------------------------------------------------------------------

export async function requireUser(redirectTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(redirectTo ? `/login?next=${encodeURIComponent(redirectTo)}` : "/login");
  }
  return user;
}

export async function requireSystemRole(roles: SystemRole[], redirectTo?: string): Promise<SessionUser> {
  const user = await requireUser(redirectTo);
  if (!roles.includes(user.systemRole)) redirect("/");
  return user;
}

export async function requirePlatformStaff(
  permission?: PlatformPermission,
  redirectTo?: string,
): Promise<SessionUser> {
  const user = await requireUser(redirectTo);
  if (!PLATFORM_STAFF_ROLES.includes(user.systemRole)) redirect("/");
  if (permission && !hasPlatformPermission(user.systemRole, permission)) {
    redirect("/admin");
  }
  return user;
}

export type PartnerContext = {
  user: SessionUser;
  partner: Partner;
  membership: PartnerMember;
  permissions: PartnerPermission[];
  memberships: (PartnerMember & { partner: Partner })[];
  can: (permission: PartnerPermission) => boolean;
};

export const getPartnerContext = cache(async (): Promise<PartnerContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const memberships = await prisma.partnerMember.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { partner: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) return null;

  const store = await cookies();
  const activePartnerId = store.get(ACTIVE_PARTNER_COOKIE)?.value;
  const membership =
    memberships.find((entry) => entry.partnerId === activePartnerId) ?? memberships[0];

  const permissions = resolvePartnerPermissions(membership.role, membership.permissions);

  return {
    user,
    partner: membership.partner,
    membership,
    permissions,
    memberships,
    can: (permission: PartnerPermission) => permissions.includes(permission),
  };
});

export async function requirePartnerContext(): Promise<PartnerContext> {
  const user = await requireUser("/partner");
  const context = await getPartnerContext();
  if (!context) redirect("/partner/register");
  return context;
}

export async function requirePartnerPermission(permission: PartnerPermission): Promise<PartnerContext> {
  const context = await requirePartnerContext();
  if (!context.can(permission)) redirect("/partner");
  return context;
}

export async function setActivePartner(partnerId: string) {
  const store = await cookies();
  store.set(ACTIVE_PARTNER_COOKIE, partnerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_HOURS * 3600,
  });
}

/** True where the acting user is RentOps staff (used for elevated UI). */
export function isRemtopsStaff(user: Pick<User, "systemRole">) {
  return PLATFORM_STAFF_ROLES.includes(user.systemRole);
}
