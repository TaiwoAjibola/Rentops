import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";

import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import { Input } from "@/components/ui/field";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import {
  PageHeader,
  Panel,
  param,
  type SearchParams,
} from "@/components/admin/ui";
import { formatDateTime } from "@/lib/dates";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformStaff("audit.view");

  const params = await searchParams;
  const q = param(params, "q");

  const entries = await prisma.auditLog.findMany({
    where: q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" } },
            { summary: { contains: q, mode: "insensitive" } },
            { entityType: { contains: q, mode: "insensitive" } },
            { actorEmail: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Audit trail"
        description="Every recorded decision and change, newest first."
      />

      <Panel title="Filter" bodyClassName="py-3">
        <FilterForm action="/admin/audit" resetHref="/admin/audit">
          <FilterField label="Search">
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Action, actor, entity, summary…" />
          </FilterField>
        </FilterForm>
      </Panel>

      {entries.length === 0 ? (
        <EmptyState title="No audit entries" description="Actions will appear here once staff work through the queues." />
      ) : (
        <DataTable headers={["When", "Actor", "Action", "Entity", "Summary"]}>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
              <TableCell>{entry.actorEmail ?? entry.actorRole ?? "system"}</TableCell>
              <TableCell>{entry.action}</TableCell>
              <TableCell>
                {entry.entityType}
                {entry.entityId ? (
                  <span className="block text-[12px] text-ink-500">{entry.entityId.slice(0, 12)}</span>
                ) : null}
              </TableCell>
              <TableCell>{entry.summary ?? "—"}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
