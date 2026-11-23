import Link from "next/link";

import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";

import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Select } from "@/components/ui/field";
import {
  PageHeader,
  Panel,
  VerificationStatusBadge,
  param,
  type SearchParams,
} from "@/components/admin/ui";
import { VERIFICATION_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";

const STATUSES: Array<"PENDING" | "IN_REVIEW" | "VERIFIED" | "REJECTED"> = ["PENDING", "IN_REVIEW", "VERIFIED", "REJECTED"];

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformStaff("partner.verify");

  const params = await searchParams;
  const status = param(params, "status");
  const statusFilter = status && STATUSES.includes(status as (typeof STATUSES)[number])
    ? (status as (typeof STATUSES)[number])
    : undefined;
  const records = await prisma.verificationRecord.findMany({
    where: statusFilter ? { status: statusFilter, subjectType: { in: ["USER", "PARTNER"] } } : { subjectType: { in: ["USER", "PARTNER"] } },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const propertyChecks = await prisma.propertyVerificationCheck.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    include: { property: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const openDocuments = await prisma.partnerDocument.count({ where: { status: { in: ["PENDING", "IN_REVIEW"] } } });
  const openRecords = await prisma.verificationRecord.count({ where: { status: { in: ["PENDING", "IN_REVIEW"] } } });
  const openChecks = await prisma.propertyVerificationCheck.count({ where: { status: { in: ["PENDING", "IN_REVIEW"] } } });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command centre"
        title="Verification queue"
        description="Documents, records and checks awaiting a RentOps decision."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel title="Partner documents"><p className="text-3xl font-semibold text-ink-900">{openDocuments}</p></Panel>
        <Panel title="Verification records"><p className="text-3xl font-semibold text-ink-900">{openRecords}</p></Panel>
        <Panel title="Property checks"><p className="text-3xl font-semibold text-ink-900">{openChecks}</p></Panel>
      </div>

      <Panel title="Filter by status" bodyClassName="py-3">
        <FilterForm action="/admin/verification" resetHref="/admin/verification">
          <FilterField label="Status">
            <Select id="status" name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              {STATUSES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </FilterField>
        </FilterForm>
      </Panel>

      <Panel title="Verification records" description="Identity and background checks">
        {records.length === 0 ? (
          <p className="text-sm text-ink-500">Nothing here.</p>
        ) : (
          <DataTable headers={["Type", "Subject", "Provider", "Status", "Submitted"]}>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{VERIFICATION_TYPE_LABELS[record.type]}</TableCell>
                <TableCell>
                  {record.user
                    ? `${record.user.firstName} ${record.user.lastName}`
                    : record.subjectType === "PARTNER"
                      ? "Partner"
                      : "—"}
                  <span className="block text-[12px] text-ink-500">{record.user?.email ?? ""}</span>
                </TableCell>
                <TableCell>{record.provider ?? "—"}</TableCell>
                <TableCell>
                  <VerificationStatusBadge status={record.status} />
                </TableCell>
                <TableCell>{formatDateTime(record.submittedAt)}</TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Panel>

      <Panel title="Property checks" description="On-site or media checks by partners">
        {propertyChecks.length === 0 ? (
          <p className="text-sm text-ink-500">Nothing here.</p>
        ) : (
          <DataTable headers={["Property", "Type", "Status", "Updated"]}>
            {propertyChecks.map((check) => (
              <TableRow key={check.id}>
                <TableCell>
                  <Link href={`/admin/properties/${check.property.id}`} className="hover:underline">
                    {check.property.name}
                  </Link>
                </TableCell>
                <TableCell>{VERIFICATION_TYPE_LABELS[check.type]}</TableCell>
                <TableCell>
                  <VerificationStatusBadge status={check.status} />
                </TableCell>
                <TableCell>{formatDateTime(check.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Panel>
    </div>
  );
}
