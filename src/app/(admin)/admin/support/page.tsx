import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";

import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Select } from "@/components/ui/field";
import {
  PageHeader,
  Panel,
  param,
  type SearchParams,
  TicketStatusBadge,
  TicketPriorityBadge,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
} from "@/components/admin/ui";
import { formatDateTime } from "@/lib/dates";

const STATUSES: Array<"OPEN" | "PENDING" | "RESOLVED" | "CLOSED"> = ["OPEN", "PENDING", "RESOLVED", "CLOSED"];

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformStaff("support.manage");

  const params = await searchParams;
  const status = param(params, "status");

  const tickets = await prisma.supportTicket.findMany({
    where: status && STATUSES.includes(status as (typeof STATUSES)[number])
      ? { status: status as (typeof STATUSES)[number] }
      : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const open = tickets.filter((entry) => entry.status === "OPEN" || entry.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Support desk"
        description="Customer and partner tickets awaiting an answer."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Open / pending"><p className="text-3xl font-semibold text-ink-900">{open}</p></Panel>
        <Panel title="Total shown"><p className="text-3xl font-semibold text-ink-900">{tickets.length}</p></Panel>
      </div>

      <Panel title="Filter by status" bodyClassName="py-3">
        <FilterForm action="/admin/support" resetHref="/admin/support">
          <FilterField label="Status">
            <Select id="status" name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              {STATUSES.map((entry) => (
                <option key={entry} value={entry}>
                  {TICKET_STATUS_LABELS[entry]}
                </option>
              ))}
            </Select>
          </FilterField>
        </FilterForm>
      </Panel>

      {tickets.length === 0 ? (
        <EmptyState title="No tickets" description="No support tickets match that filter." />
      ) : (
        <DataTable headers={["Reference", "Subject", "From", "Priority", "Status", "Opened"]}>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>{ticket.reference}</TableCell>
              <TableCell>{ticket.subject}</TableCell>
              <TableCell>
                {ticket.user ? `${ticket.user.firstName} ${ticket.user.lastName}` : ticket.email ?? "—"}
                <span className="block text-[12px] text-ink-500">{ticket.user?.email ?? ""}</span>
              </TableCell>
              <TableCell>
                <TicketPriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell>
                <TicketStatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>{formatDateTime(ticket.createdAt)}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
