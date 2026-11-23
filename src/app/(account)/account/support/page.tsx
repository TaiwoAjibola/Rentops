import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { AccountPageHeader } from "@/components/account/page-header";
import { CustomerActionForm } from "@/components/account/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/admin/ui";
import { createSupportTicket, replyToTicket } from "@/server/actions/customer-support";

export const metadata = { title: "Support" };

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const user = await requireUser("/account/support");
  const query = await searchParams;

  const [tickets, reservations] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.reservation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { reference: true },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <AccountPageHeader
        eyebrow="Help"
        title="RentOps support"
        description="Raise a ticket and we'll get back to you — usually the same day."
        actions={<ButtonLink href="/account/messages" size="sm" variant="outline">Messages</ButtonLink>}
      />

      {query.ticket ? (
        <p className="mb-4 rounded-md border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
          Ticket {query.ticket} opened — our team replies here and by email.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Raise a ticket</h2>
          <CustomerActionForm action={createSupportTicket} submitLabel="Submit ticket" className="mt-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="ticket-category" required>
                <Select id="ticket-category" name="category" defaultValue="OTHER" required>
                  <option value="BOOKING">Booking</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="PROPERTY">Property</option>
                  <option value="INSPECTION">Inspection</option>
                  <option value="VERIFICATION">Verification</option>
                  <option value="ACCOUNT">Account</option>
                  <option value="PARTNER">Partner</option>
                  <option value="OTHER">Other</option>
                </Select>
              </Field>
              <Field label="Priority" htmlFor="ticket-priority">
                <Select id="ticket-priority" name="priority" defaultValue="MEDIUM">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </Select>
              </Field>
            </div>

            <Field label="Subject" htmlFor="ticket-subject" required>
              <Input id="ticket-subject" name="subject" required placeholder="What's going on?" />
            </Field>

            <Field label="Details" htmlFor="ticket-description" required hint="What happened, and what would you like to happen?">
              <Textarea id="ticket-description" name="description" rows={4} required />
            </Field>

            {reservations.length > 0 ? (
              <Field label="Related reservation" htmlFor="ticket-reservation" hint="Optional — helps us find the booking fast.">
                <Select id="ticket-reservation" name="reservation" defaultValue="">
                  <option value="">Not related to a booking</option>
                  {reservations.map((entry) => (
                    <option key={entry.reference} value={entry.reference}>
                      {entry.reference}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </CustomerActionForm>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Your tickets</h2>
          {tickets.length === 0 ? (
            <EmptyState
              icon={<LifeBuoy className="h-5 w-5" aria-hidden />}
              title="No tickets yet"
              description="Raise a ticket on the left — we answer in your messages and by email."
            />
          ) : (
            <ul className="mt-3 space-y-2">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="rounded-md border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-ink-900">{ticket.subject}</p>
                    <div className="flex items-center gap-2">
                      <TicketPriorityBadge priority={ticket.priority} />
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                  </div>
                  <p className="mt-0.5 text-[12px] text-ink-500">
                    {ticket.reference} · updated {relativeTime(ticket.updatedAt)}
                  </p>
                  {ticket.status !== "CLOSED" ? (
                    <CustomerActionForm
                      action={replyToTicket}
                      hidden={{ reference: ticket.reference }}
                      submitLabel="Send reply"
                      submitVariant="outline"
                      submitSize="sm"
                      className="mt-2"
                    >
                      <Field label="Reply" htmlFor={`reply-${ticket.id}`}>
                        <Input id={`reply-${ticket.id}`} name="body" placeholder="Write a reply…" />
                      </Field>
                    </CustomerActionForm>
                  ) : (
                    <p className="mt-1 text-[12px] text-ink-400">This ticket is closed.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
