import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePlatformStaff } from "@/lib/auth/session";
import prisma from "@/lib/db";

import { BookingModeBadge, PageHeader, Panel, ReservationStatusBadge, KeyValue, When } from "@/components/admin/ui";
import { DataTable, TableCell, TableRow } from "@/components/ui/data";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export default async function AdminReservationDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  await requirePlatformStaff("booking.view");

  const { reference } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { reference },
    include: {
      property: { select: { id: true, name: true, city: true, partnerId: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      units: {
        include: {
          unit: { select: { id: true, label: true, unitNumber: true } },
        },
      },
      payments: true,
      settlements: true,
    },
  });

  if (!reservation) notFound();

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-500">
        <Link href="/admin/reservations" className="hover:text-brand-700">Reservations</Link>
        <span className="mx-2">/</span>
        <span className="text-ink-800">{reservation.reference}</span>
      </nav>

      <PageHeader
        eyebrow="Reservation"
        title={reservation.reference}
        description={reservation.property.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReservationStatusBadge status={reservation.status} />
            <BookingModeBadge mode={reservation.bookingMode} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Breakdown" description={`${reservation.nights} nights · ${reservation.guests} guest(s)`}>
          <KeyValue
            items={[
              { label: "Property", value: reservation.property.name },
              { label: "Location", value: reservation.property.city },
              { label: "Check-in", value: <When value={reservation.checkIn} /> },
              { label: "Check-out", value: <When value={reservation.checkOut} /> },
              { label: "Price basis", value: reservation.priceBasis },
              { label: "Payment option", value: reservation.paymentOption === "PAY_LATER" ? "Reserve now, pay later" : "Pay now" },
              {
                label: "Hold / payment deadline",
                value: reservation.holdExpiresAt ? formatDate(reservation.holdExpiresAt, { dateStyle: "medium", timeStyle: "short" }) : "—",
              },
              { label: "Gross (customer)", value: formatMoney(reservation.grossAmount, reservation.currency) },
              {
                label: "RentOps commission",
                value: formatMoney(reservation.platformCommission, reservation.currency),
              },
              {
                label: "Partner net",
                value: formatMoney(reservation.partnerNetAmount, reservation.currency),
              },
              { label: "Tax", value: formatMoney(reservation.taxAmount, reservation.currency) },
              { label: "Caution / deposit", value: formatMoney(reservation.cautionAmount, reservation.currency) },
              { label: "Cleaning fee", value: formatMoney(reservation.cleaningFee, reservation.currency) },
              { label: "Service charge", value: formatMoney(reservation.serviceCharge, reservation.currency) },
              { label: "Created", value: formatDate(reservation.createdAt) },
            ]}
          />
          {Array.isArray(reservation.appliedFees) && (reservation.appliedFees as any[]).length > 0 ? (
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">Applied fees</p>
              <ul className="mt-2 space-y-1 text-sm text-ink-700">
                {(reservation.appliedFees as any[]).map((fee, idx) => (
                  <li key={String(fee.id ?? idx)}>
                    {fee.name} — {fee.isVariable ? "variable (amount to be confirmed)" : formatMoney(Number(fee.amount) || 0, reservation.currency)}
                    {fee.isRefundable ? " (refundable)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/admin/properties/${reservation.property.id}`}
              className="inline-flex rounded-md border border-line px-3 py-2 text-[13px] font-medium text-ink-700 hover:bg-ink-50"
            >
              View property
            </Link>
            <Link
              href={`/admin/partners/${reservation.property.partnerId}`}
              className="inline-flex rounded-md border border-line px-3 py-2 text-[13px] font-medium text-ink-700 hover:bg-ink-50"
            >
              View partner
            </Link>
            <Link
              href={`/admin/users/${reservation.user.id}`}
              className="inline-flex rounded-md border border-line px-3 py-2 text-[13px] font-medium text-ink-700 hover:bg-ink-50"
            >
              View guest account
            </Link>
          </div>
        </Panel>

        <Panel title="Guest">
          <KeyValue
            items={[
              { label: "Name", value: `${reservation.user.firstName} ${reservation.user.lastName}` },
              { label: "Email", value: reservation.user.email },
              { label: "Phone", value: reservation.user.phone ?? "—" },
            ]}
          />

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">Units</p>
            {reservation.units.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">No units recorded.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {reservation.units.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm"
                  >
                    <span>{entry.unit.label}{entry.unit.unitNumber ? ` · ${entry.unit.unitNumber}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Payments" description="Payment attempts against this reservation">
        {reservation.payments.length === 0 ? (
          <p className="text-sm text-ink-500">No payments recorded yet.</p>
        ) : (
          <DataTable headers={["Reference", "Amount", "Status", "Paid at"]}>
            {reservation.payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.reference}</TableCell>
                <TableCell>{formatMoney(payment.amount, payment.currency)}</TableCell>
                <TableCell>{payment.status}</TableCell>
                <TableCell>{payment.paidAt ? formatDate(payment.paidAt) : "—"}</TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </Panel>

      {reservation.settlements.length > 0 ? (
        <Panel title="Settlement" description="Payout for this reservation">
          <KeyValue
            items={[
              { label: "Reference", value: reservation.settlements[0]!.reference },
              { label: "Status", value: reservation.settlements[0]!.status },
              { label: "Net payable", value: formatMoney(reservation.settlements[0]!.netPayable, reservation.settlements[0]!.currency) },
              {
                label: "Held until",
                value: reservation.settlements[0]!.holdUntil ? <When value={reservation.settlements[0]!.holdUntil} /> : "—",
              },
            ]}
          />
        </Panel>
      ) : null}
    </div>
  );
}
