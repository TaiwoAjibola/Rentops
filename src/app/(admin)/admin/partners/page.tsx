import Link from "next/link";
import type { PartnerType, VerificationStatus } from "@prisma/client";
import { Building2 } from "lucide-react";

import { requirePlatformStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PARTNER_TYPE_LABELS, VERIFICATION_STATUS_LABELS } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

import { Input, Select } from "@/components/ui/field";
import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Pagination } from "@/components/admin/pagination";
import {
  PageHeader,
  Panel,
  param,
  paramPage,
  queryWithoutPage,
  VerificationStatusBadge,
  When,
  type SearchParams,
} from "@/components/admin/ui";

const PAGE_SIZE = 25;
const TYPES = Object.keys(PARTNER_TYPE_LABELS) as PartnerType[];
const VERIFICATION_STATUSES = Object.keys(VERIFICATION_STATUS_LABELS) as VerificationStatus[];

export default async function AdminPartnersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePlatformStaff("partner.view");

  const params = await searchParams;
  const page = paramPage(params);
  const q = param(params, "q");
  const verification = param(params, "verification");
  const type = param(params, "type");

  const where: Prisma.PartnerWhereInput = {
    ...(verification && VERIFICATION_STATUSES.includes(verification as VerificationStatus)
      ? { verificationStatus: verification as VerificationStatus }
      : {}),
    ...(type && TYPES.includes(type as PartnerType) ? { type: type as PartnerType } : {}),
    ...(q
      ? {
          OR: [
            { businessName: { contains: q, mode: "insensitive" } },
            { legalName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [partners, total, pendingDocuments] = await Promise.all([
    prisma.partner.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { properties: true, members: true, documents: true } } },
    }),
    prisma.partner.count({ where }),
    prisma.partnerDocument.count({ where: { status: { in: ["PENDING", "IN_REVIEW"] } } }),
  ]);

  const query = queryWithoutPage(params);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Property partners"
        description="Every organisation listing accommodation on RentOps, with its verification standing and portfolio size."
        actions={
          <Link
            href="/admin/verification"
            className="inline-flex h-11 items-center rounded-md border border-line-strong bg-white px-4 text-[13px] font-medium text-ink-800 transition-colors hover:bg-ink-50"
          >
            {pendingDocuments} document{pendingDocuments === 1 ? "" : "s"} awaiting review
          </Link>
        }
      />

      <Panel
        title="Partners"
        description={`${total} partner${total === 1 ? "" : "s"} match the current filters`}
        bodyClassName="px-0 py-0"
      >
        <div className="border-b border-line px-5 py-4">
          <FilterForm action="/admin/partners" resetHref="/admin/partners">
            <FilterField label="Search">
              <Input name="q" defaultValue={q} placeholder="Business, legal name, email or city" className="w-64" />
            </FilterField>
            <FilterField label="Verification">
              <Select name="verification" defaultValue={verification}>
                <option value="">Any status</option>
                {VERIFICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {VERIFICATION_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </FilterField>
            <FilterField label="Type">
              <Select name="type" defaultValue={type}>
                <option value="">All types</option>
                {TYPES.map((entry) => (
                  <option key={entry} value={entry}>
                    {PARTNER_TYPE_LABELS[entry]}
                  </option>
                ))}
              </Select>
            </FilterField>
          </FilterForm>
        </div>

        {partners.length === 0 ? (
          <EmptyState
            className="m-5"
            icon={<Building2 className="h-5 w-5" />}
            title="No partners found"
            description="Registered property businesses will appear here for verification."
          />
        ) : (
          <>
            <DataTable headers={["Business", "Type", "Verification", "Properties", "Members", "Documents", "Joined", ""]}>
              {partners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <p className="truncate text-[14px] font-medium text-ink-900">{partner.businessName}</p>
                    <p className="truncate text-[12px] text-ink-500">
                      {partner.email}
                      {partner.city ? ` · ${partner.city}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-600">{PARTNER_TYPE_LABELS[partner.type]}</TableCell>
                  <TableCell>
                    <VerificationStatusBadge status={partner.verificationStatus} />
                  </TableCell>
                  <TableCell className="tabular-nums">{partner._count.properties}</TableCell>
                  <TableCell className="tabular-nums">{partner._count.members}</TableCell>
                  <TableCell className="tabular-nums">{partner._count.documents}</TableCell>
                  <TableCell className="whitespace-nowrap text-[13px] text-ink-500">
                    {partner.createdAt.toISOString().slice(0, 10)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/partners/${partner.id}`}
                      className="text-[13px] font-medium text-brand-700 hover:text-brand-800"
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
            <Pagination basePath="/admin/partners" query={query} page={page} pageSize={PAGE_SIZE} total={total} />
          </>
        )}
      </Panel>

      <Panel title="Recent partner activity" description="Latest partner records created on the platform">
        {partners.length === 0 ? (
          <EmptyState title="No activity" />
        ) : (
          <ul className="divide-y divide-line">
            {partners.slice(0, 6).map((partner) => (
              <li key={partner.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="truncate text-[13px] text-ink-700">{partner.businessName}</span>
                <When value={partner.createdAt} className="shrink-0 text-[12px] text-ink-500" />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
