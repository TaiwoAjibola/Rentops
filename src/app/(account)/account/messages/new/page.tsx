import Link from "next/link";

import { AccountPageHeader } from "@/components/account/page-header";
import { CustomerActionForm } from "@/components/account/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { startPropertyEnquiry } from "@/server/actions/customer-messages";

export const metadata = { title: "Message a property" };

export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const user = await requireUser("/account/messages/new");
  const query = await searchParams;

  const properties = await prisma.property.findMany({
    where: { status: "APPROVED", isActive: true },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: { id: true, name: true, slug: true, city: true },
  });

  const preselected = query.property ? properties.find((entry) => entry.slug === query.property) : undefined;

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <AccountPageHeader
        eyebrow="Talk"
        title="Message a property"
        description="Ask about the space before you book — the reply lands right here in your messages."
        actions={<ButtonLink href="/account/messages" size="sm" variant="outline">My messages</ButtonLink>}
      />

      {properties.length === 0 ? (
        <p className="rounded-lg border border-line bg-white p-6 text-[14px] text-ink-600">
          No listings are taking enquiries right now — try again later.
        </p>
      ) : (
        <CustomerActionForm action={startPropertyEnquiry} submitLabel="Send enquiry" className="rounded-lg border border-line bg-white p-5">
          <Field label="Property" htmlFor="new-message-property" required>
            <Select id="new-message-property" name="propertyId" defaultValue={preselected?.id ?? ""} required>
              <option value="">Choose a property…</option>
              {properties.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} — {entry.city}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Subject" htmlFor="new-message-subject" required>
            <Input id="new-message-subject" name="subject" placeholder="e.g. Is the Wi-Fi fast enough for work?" required />
          </Field>

          <Field label="Your question" htmlFor="new-message-body" required hint="Most properties reply within a day.">
            <Textarea id="new-message-body" name="body" rows={4} required />
          </Field>
        </CustomerActionForm>
      )}
    </div>
  );
}
