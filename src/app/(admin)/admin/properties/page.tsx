import Link from "next/link";
import type { PropertyStatus } from "@prisma/client";
import { Building2 } from "lucide-react";

import { requirePlatformStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PROPERTY_STATUS_LABELS } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

import { Input, Select } from "@/components/ui/field";
import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import { PriceInline } from "@/components/ui/price";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Pagination } from "@/components/admin/pagination";
import {
  PageHeader,
  Panel,
  param,
  paramPage,
  PropertyStatusBadge,
  queryWithoutPage,
  Thumb,
  YesNo,
  type SearchParams,
} from "@/components/admin/ui";

const PAGE_SIZE = 25;
const STATUSES = Object.keys(PROPERTY_STATUS_LABELS) as PropertyStatus[];

export default async function AdminPropertiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePlatformStaff("property.review");

  const params = await searchParams;
  const page = paramPage(params);
  const q = param(params, "q");
  const status = param(params, "status");
  const partnerId = param(params, "partnerId");

  const [categories, statusGroups] = await Promise.all([
    prisma.propertyCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.property.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const categoryId = param(params, "categoryId");
  const statusCounts = new Map(statusGroups.map((row) => [row.status, row._count._all]));

  const where: Prisma.PropertyWhereInput = {
    ...(status && STATUSES.includes(status as PropertyStatus) ? { status: status as PropertyStatus } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(partnerId ? { partnerId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        partner: { select: { id: true, businessName: true, verificationStatus: true } },
        category: { select: { name: true } },
        _count: { select: { units: true, reservations: true } },
      },
    }),
    prisma.property.count({ where }),
  ]);

  const query = queryWithoutPage(params);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Supply"
        title="Property review"
        description="Every listing on RentOps. Only properties that are APPROVED and active are publicly discoverable."
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STATUSES.map((entry) => (
          <Link
            key={entry}
            href={`/admin/properties?status=${entry}`}
            className={`rounded-lg border p-4 shadow-xs transition-colors ${
              status === entry ? "border-brand-400 bg-brand-50/60" : "border-line bg-white hover:border-brand-300"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500">
              {PROPERTY_STATUS_LABELS[entry]}
            </p>
            <p className="mt-2 font-display text-xl leading-none text-ink-900">{statusCounts.get(entry) ?? 0}</p>
          </Link>
        ))}
      </div>

      <Panel
        title="Listings"
        description={`${total} propert${total === 1 ? "y" : "ies"} match the current filters`}
        bodyClassName="px-0 py-0"
      >
        <div className="border-b border-line px-5 py-4">
          <FilterForm action="/admin/properties" resetHref="/admin/properties">
            <FilterField label="Search">
              <Input name="q" defaultValue={q} placeholder="Name, city or slug" className="w-56" />
            </FilterField>
            <FilterField label="Status">
              <Select name="status" defaultValue={status}>
                <option value="">All statuses</option>
                {STATUSES.map((entry) => (
                  <option key={entry} value={entry}>
                    {PROPERTY_STATUS_LABELS[entry]}
                  </option>
                ))}
              </Select>
            </FilterField>
            <FilterField label="Category">
              <Select name="categoryId" defaultValue={categoryId}>
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FilterField>
            {partnerId ? <input type="hidden" name="partnerId" value={partnerId} /> : null}
          </FilterForm>
        </div>

        {properties.length === 0 ? (
          <EmptyState
            className="m-5"
            icon={<Building2 className="h-5 w-5" />}
            title="No properties found"
            description="Listings submitted by partners arrive here for moderation."
          />
        ) : (
          <>
            <DataTable headers={["", "Property", "Partner", "Category", "Location", "Rate", "Units", "Status", ""]}>
              {properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <Thumb src={property.coverImageUrl} alt={property.name} size="sm" />
                  </TableCell>
                  <TableCell>
                    <p className="truncate text-[14px] font-medium text-ink-900">{property.name}</p>
                    <p className="truncate text-[12px] text-ink-500">{property.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/partners/${property.partner.id}`}
                      className="text-[13px] text-brand-700 hover:text-brand-800"
                    >
                      {property.partner.businessName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-600">{property.category.name}</TableCell>
                  <TableCell className="text-[13px] text-ink-600">
                    {property.area ? `${property.area}, ` : ""}
                    {property.city}
                  </TableCell>
                  <TableCell>
                    {property.baseNightlyRate != null ? (
                      <PriceInline
                        amount={property.baseNightlyRate}
                        currency={property.currency}
                        basis={property.priceBasis}
                      />
                    ) : (
                      <span className="text-[13px] text-ink-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{property._count.units}</TableCell>
                  <TableCell>
                    <PropertyStatusBadge status={property.status} />
                    <p className="mt-1 text-[12px] text-ink-500">Live: <YesNo value={property.isActive} /></p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/properties/${property.id}`}
                      className="text-[13px] font-medium text-brand-700 hover:text-brand-800"
                    >
                      Review
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
            <Pagination basePath="/admin/properties" query={query} page={page} pageSize={PAGE_SIZE} total={total} />
          </>
        )}
      </Panel>
    </div>
  );
}
