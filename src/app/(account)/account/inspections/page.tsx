import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { AccountPageHeader } from "@/components/account/page-header";
import { CustomerActionForm } from "@/components/account/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { INSPECTION_STATUS_LABELS, INSPECTION_STATUS_TONES } from "@/lib/constants";
import { cancelInspection } from "@/server/actions/customer-inspections";

export const metadata = { title: "Inspections" };

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireUser("/account/inspections");
  const query = await searchParams;

  const requests = await prisma.inspectionRequest.findMany({
    where: { userId: user.id },
    include: { property: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <AccountPageHeader
        eyebrow="Visits"
        title="Inspections"
        description="Property visits you have requested — scheduled times and outcomes."
        actions={
          <ButtonLink href="/search" size="sm" variant="outline">
            Find a place to visit
          </ButtonLink>
        }
      />

      {query.created ? (
        <p className="mb-4 rounded-md border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
          Inspection request {query.created} submitted — the property will confirm the visit.
        </p>
      ) : null}

      {requests.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-5 w-5" aria-hidden />}
          title="No inspections yet"
          description="When a property is marked “inspection required”, request a visit and it appears here."
          action={<ButtonLink href="/search" size="sm">Browse properties</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/properties/${request.property.slug}`}
                  className="font-semibold text-ink-900 hover:text-brand-700"
                >
                  {request.property.name}
                </Link>
                <p className="mt-0.5 text-[13px] text-ink-500">
                  {request.reference} · requested {formatDateTime(request.createdAt)}
                  {request.preferredDate ? ` · preferred ${formatDateTime(request.preferredDate)}` : ""}
                  {request.preferredWindow ? ` (${request.preferredWindow.toLowerCase()})` : ""}
                </p>
                {request.notes ? <p className="mt-1 text-[13px] text-ink-600">{request.notes}</p> : null}
              </div>

              <Badge tone={INSPECTION_STATUS_TONES[request.status]}>
                {INSPECTION_STATUS_LABELS[request.status]}
              </Badge>

              {!["COMPLETED", "CANCELLED", "DECLINED"].includes(request.status) ? (
                <CustomerActionForm
                  action={cancelInspection}
                  hidden={{ reference: request.reference }}
                  submitLabel="Cancel"
                  submitVariant="outline"
                  submitSize="sm"
                  showStatus={false}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
