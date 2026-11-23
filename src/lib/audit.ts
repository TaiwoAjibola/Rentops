import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Audit trail. Every sensitive administrative or financial action is recorded
 * with its actor, action, entity and before/after snapshot.
 */

export type AuditInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  request?: Request | Headers;
};

async function requestContext(request?: Request | Headers) {
  try {
    const source = request ?? (await headers());
    const headerList = source instanceof Headers ? source : new Headers(source.headers);
    return {
      ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: headerList.get("user-agent") ?? null,
    };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

export async function recordAudit(input: AuditInput) {
  const context = await requestContext(input.request);

  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary ?? null,
      before: (input.before as Prisma.InputJsonValue) ?? undefined,
      after: (input.after as Prisma.InputJsonValue) ?? undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    },
  });
}

export async function getAuditTrail(entityType: string, entityId: string, take = 50) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getRecentAudit(take = 50) {
  return prisma.auditLog.findMany({
    include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}
