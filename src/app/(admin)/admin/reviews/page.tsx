import Link from "next/link";

import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";
import type { ReviewStatus } from "@prisma/client";

import { DataTable, EmptyState, TableCell, TableRow } from "@/components/ui/data";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Select } from "@/components/ui/field";
import {
  PageHeader,
  Panel,
  ReviewStatusBadge,
  param,
  type SearchParams,
} from "@/components/admin/ui";
import { formatDate } from "@/lib/dates";

const STATUSES: ReviewStatus[] = ["PENDING", "PUBLISHED", "HIDDEN", "REMOVED"];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformStaff("property.review");

  const params = await searchParams;
  const status = param(params, "status");

  const reviews = await prisma.review.findMany({
    where: status && STATUSES.includes(status as ReviewStatus)
      ? { status: status as ReviewStatus }
      : {},
    include: {
      property: { select: { id: true, name: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bookings"
        title="Review moderation"
        description="Guest reviews awaiting or hidden from publication."
      />

      <Panel title="Filter by status" bodyClassName="py-3">
        <FilterForm action="/admin/reviews" resetHref="/admin/reviews">
          <FilterField label="Status">
            <Select id="status" name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              {STATUSES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </FilterField>
        </FilterForm>
      </Panel>

      {reviews.length === 0 ? (
        <EmptyState title="Nothing to moderate" description="No reviews match that filter." />
      ) : (
        <DataTable headers={["Property", "Guest", "Rating", "Status", "Submitted", ""]}>
          {reviews.map((review) => (
            <TableRow key={review.id}>
              <TableCell>
                <Link href={`/admin/properties/${review.property.id}`} className="hover:underline">
                  {review.property.name}
                </Link>
              </TableCell>
              <TableCell>
                {review.user.firstName} {review.user.lastName}
                <span className="block text-[12px] text-ink-500">{review.user.email}</span>
              </TableCell>
              <TableCell>{review.overallRating} / 5</TableCell>
              <TableCell>
                <ReviewStatusBadge status={review.status} />
              </TableCell>
              <TableCell>{formatDate(review.createdAt)}</TableCell>
              <TableCell className="max-w-xs text-[13px] text-ink-600">{review.title ?? review.body.slice(0, 60)}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
