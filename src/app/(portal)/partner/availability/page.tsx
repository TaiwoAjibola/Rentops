import { notFound } from "next/navigation";
import Link from "next/link";

import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { getUnitCalendar } from "@/lib/availability";
import { AvailabilityBoard, MaintenanceHint } from "@/components/partner/availability-calendar";
import { Callout, EmptyState } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { monthLabel, parseDateInput, toISODate, addUtcMonths, startOfTodayUtc } from "@/lib/dates";

function monthStart(input: string | undefined) {
  const parsed = parseDateInput(input ?? "");
  if (!parsed) {
    const today = startOfTodayUtc();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
}

export default async function PartnerAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; unitId?: string }>;
}) {
  const { partner } = await requirePartnerContext();
  const query = await searchParams;
  const requested = query.unitId;

  const properties = await prisma.property.findMany({
    where: { partnerId: partner.id },
    select: { id: true, name: true, coverImageUrl: true },
    orderBy: { name: "asc" },
  });
  if (properties.length === 0) notFound();

  const units = await prisma.unit.findMany({
    where: { propertyId: { in: properties.map((entry) => entry.id) } },
    orderBy: [{ propertyId: "asc" }, { sortOrder: "asc" }],
    select: { id: true, label: true, propertyId: true },
  });

  if (units.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeading eyebrow="Availability" title="No units yet" />
        <EmptyState
          title="Add units first"
          description="Availability is managed per unit. Add rooms or units to a property, then block dates here."
        />
      </div>
    );
  }

  if (requested && !units.some((entry) => entry.id === requested)) {
    return (
      <div className="space-y-6">
        <SectionHeading eyebrow="Availability" title="Availability calendar" />
        <Callout tone="warning" title="That space isn't on your account">
          The space referenced in that link doesn&apos;t belong to your portfolio — it may belong to a
          different partner. You can only manage spaces you own or staff.
        </Callout>
        <Link
          href="/partner/availability"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700 hover:underline"
        >
          Open your availability calendar →
        </Link>
      </div>
    );
  }

  const selected = units.find((entry) => entry.id === requested) ?? units[0]!;
  const start = monthStart(query.month);
  const end = addUtcMonths(start, 1);

  const [days, blocks] = await Promise.all([
    getUnitCalendar(selected.id, start, end),
    prisma.availabilityBlock.findMany({
      where: { unitId: selected.id, startDate: { lt: end }, endDate: { gt: start } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const property = properties.find((entry) => entry.id === selected.propertyId)!;
  const monthKey = toISODate(start).slice(0, 7);
  const base = "/partner/availability";

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Availability"
        title="Availability calendar"
        description="Block dates for maintenance or owner use, and see what is already booked."
      />

      <AvailabilityBoard
        units={units.map((unit) => ({
          id: unit.id,
          label: unit.label,
          propertyId: unit.propertyId,
          propertyName:
            properties.find((entry) => entry.id === unit.propertyId)?.name ?? "Property",
          coverImageUrl:
            properties.find((entry) => entry.id === unit.propertyId)?.coverImageUrl ?? null,
        }))}
        selectedUnitId={selected.id}
        days={days}
        blocks={blocks.map((block) => ({
          id: block.id,
          startDate: toISODate(block.startDate),
          endDate: toISODate(block.endDate),
          reason: block.reason,
          note: block.note,
        }))}
        monthLabel={`${monthLabel(start)} — ${property.name}`}
        prevHref={`${base}?unitId=${selected.id}&month=${toISODate(addUtcMonths(start, -1)).slice(0, 7)}`}
        nextHref={`${base}?unitId=${selected.id}&month=${toISODate(addUtcMonths(start, 1)).slice(0, 7)}`}
        todayHref={`${base}?unitId=${selected.id}`}
        basePath={base}
      />

      <MaintenanceHint>
        Booked dates come from real reservations and cannot be edited here — cancel or amend the
        reservation instead.
      </MaintenanceHint>
    </div>
  );
}
