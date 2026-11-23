import Link from "next/link";
import type { AccountStatus, SystemRole } from "@prisma/client";
import { UserPlus } from "lucide-react";

import { requirePlatformStaff } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PLATFORM_STAFF_ROLES } from "@/lib/auth/rbac";
import { SYSTEM_ROLE_LABELS, VERIFICATION_STATUS_LABELS } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

import { Input, Select } from "@/components/ui/field";
import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Pagination } from "@/components/admin/pagination";
import {
  AccountStatusBadge,
  PageHeader,
  Panel,
  PersonCell,
  param,
  paramPage,
  queryWithoutPage,
  VerificationStatusBadge,
  type SearchParams,
} from "@/components/admin/ui";

const PAGE_SIZE = 25;
const ROLES = Object.keys(SYSTEM_ROLE_LABELS) as SystemRole[];
const STATUSES = ["ACTIVE", "SUSPENDED", "DELETED"] as AccountStatus[];

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePlatformStaff("user.view");

  const params = await searchParams;
  const page = paramPage(params);
  const q = param(params, "q");
  const role = param(params, "role");
  const status = param(params, "status");

  const where: Prisma.UserWhereInput = {
    ...(role && ROLES.includes(role as SystemRole) ? { systemRole: role as SystemRole } : {}),
    ...(status && STATUSES.includes(status as AccountStatus) ? { status: status as AccountStatus } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const [users, total, counts, suspendedCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        profile: { select: { verificationStatus: true } },
        _count: { select: { reservations: true, memberships: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ["systemRole"], _count: { _all: true } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
  ]);

  const roleCounts = new Map(counts.map((row) => [row.systemRole, row._count._all]));
  const query = queryWithoutPage(params);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Customers & RentOps staff"
        description="Every account on the platform. Staff accounts carry a RentOps role; everything else is a customer."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <RoleCountCard label="Customers" value={roleCounts.get("CUSTOMER") ?? 0} href="/admin/users?role=CUSTOMER" />
        <RoleCountCard label="RentOps staff" value={PLATFORM_STAFF_ROLES.reduce((total, entry) => total + (roleCounts.get(entry) ?? 0), 0)} href="/admin/users?role=REMTOPS_SUPPORT" />
        <RoleCountCard label="Suspended accounts" value={suspendedCount} href="/admin/users?status=SUSPENDED" />
      </div>

      <Panel title="Accounts" description={`${total} account${total === 1 ? "" : "s"} match the current filters`} bodyClassName="px-0 py-0">
        <div className="border-b border-line px-5 py-4">
          <FilterForm action="/admin/users" resetHref="/admin/users">
            <FilterField label="Search">
              <Input name="q" defaultValue={q} placeholder="Name, email or phone" className="w-64" />
            </FilterField>
            <FilterField label="Role">
              <Select name="role" defaultValue={role}>
                <option value="">All roles</option>
                {ROLES.map((entry) => (
                  <option key={entry} value={entry}>
                    {SYSTEM_ROLE_LABELS[entry]}
                  </option>
                ))}
              </Select>
            </FilterField>
            <FilterField label="Status">
              <Select name="status" defaultValue={status}>
                <option value="">Any status</option>
                {STATUSES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry === "ACTIVE" ? "Active" : entry === "SUSPENDED" ? "Suspended" : "Deleted"}
                  </option>
                ))}
              </Select>
            </FilterField>
          </FilterForm>
        </div>

        {users.length === 0 ? (
          <EmptyState
            className="m-5"
            icon={<UserPlus className="h-5 w-5" />}
            title="No accounts found"
            description="Adjust the filters above, or accounts will appear here as customers register."
          />
        ) : (
          <>
            <DataTable headers={["Account", "Role", "Status", "Verification", "Bookings", "Joined", ""]}>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <PersonCell
                      name={`${user.firstName} ${user.lastName}`}
                      email={user.email}
                      avatarUrl={user.avatarUrl}
                      secondary={user.phone ?? undefined}
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        PLATFORM_STAFF_ROLES.includes(user.systemRole)
                          ? "inline-flex rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-700"
                          : "text-[13px] text-ink-600"
                      }
                    >
                      {SYSTEM_ROLE_LABELS[user.systemRole]}
                    </span>
                    {user._count.memberships > 0 ? (
                      <p className="mt-1 text-[12px] text-ink-500">
                        {user._count.memberships} partner membership{user._count.memberships === 1 ? "" : "s"}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <AccountStatusBadge status={user.status} />
                  </TableCell>
                  <TableCell>
                    {user.profile ? (
                      <VerificationStatusBadge status={user.profile.verificationStatus} />
                    ) : (
                      <span className="text-[13px] text-ink-400">No profile</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{user._count.reservations}</TableCell>
                  <TableCell className="whitespace-nowrap text-[13px] text-ink-500">
                    {user.createdAt.toISOString().slice(0, 10)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-[13px] font-medium text-brand-700 hover:text-brand-800"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
            <Pagination basePath="/admin/users" query={query} page={page} pageSize={PAGE_SIZE} total={total} />
          </>
        )}
      </Panel>
    </div>
  );
}

function RoleCountCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-line bg-white p-5 shadow-xs transition-colors hover:border-brand-300 hover:bg-brand-50/40"
    >
      <p className="text-[12px] font-medium uppercase tracking-[0.07em] text-ink-500">{label}</p>
      <p className="mt-3 font-display text-2xl leading-none text-ink-900">{value}</p>
    </Link>
  );
}

