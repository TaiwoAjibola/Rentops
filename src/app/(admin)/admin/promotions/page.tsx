import Link from "next/link";

import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";

import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/admin/ui";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export default async function AdminPromotionsPage() {
  await requirePlatformStaff("promotion.manage");

  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    orderBy: { startsAt: "desc" },
    take: 50,
  });

  const active = promotions.filter(
    (promotion) => promotion.isActive && promotion.startsAt <= now && promotion.endsAt >= now,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Promotions"
        description="Discount codes in use across short stays and long leases. Promotions reduce the customer's price but never the partner's settlement math."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel title="Total promotions">
          <p className="text-3xl font-semibold text-ink-900">{promotions.length}</p>
        </Panel>
        <Panel title="Active now">
          <p className="text-3xl font-semibold text-ink-900">{active}</p>
        </Panel>
        <Panel title="Total uses">
          <p className="text-3xl font-semibold text-ink-900">
            {promotions.reduce((total, entry) => total + entry.usedCount, 0)}
          </p>
          <p className="mt-1 text-sm text-ink-500">Redemptions across all codes</p>
        </Panel>
      </div>

      {promotions.length === 0 ? (
        <EmptyState
          title="No promotions yet"
          description="Create a promotion with code WELCOME10 style to offer discounts."
        />
      ) : (
        <DataTable
          headers={["Code", "Type", "Value", "Scope", "Window", "Uses", "Status"]}
        >
          {promotions.map((promotion) => (
            <TableRow key={promotion.id}>
              <TableCell>
                <Link href={`/admin/promotions?id=${promotion.id}`} className="font-semibold text-brand-700 hover:underline">
                  {promotion.code}
                </Link>
              </TableCell>
              <TableCell>{promotion.type === "PERCENTAGE" ? "% off" : "Fixed amount"}</TableCell>
              <TableCell>
                {promotion.type === "PERCENTAGE" ? `${promotion.value}%` : formatMoney(promotion.value)}
              </TableCell>
              <TableCell>{promotion.scope}</TableCell>
              <TableCell>
                {formatDate(promotion.startsAt)} → {formatDate(promotion.endsAt)}
              </TableCell>
              <TableCell>
                {promotion.usedCount}
                {promotion.usageLimit ? ` / ${promotion.usageLimit}` : ""}
              </TableCell>
              <TableCell>
                <Badge tone={promotion.isActive ? "success" : "neutral"}>{promotion.isActive ? "Active" : "Inactive"}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
