import Link from "next/link";

import { AccountPageHeader } from "@/components/account/page-header";
import { CustomerActionForm } from "@/components/account/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { requestInspection } from "@/server/actions/customer-inspections";

export const metadata = { title: "Request an inspection" };

export default async function NewInspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const user = await requireUser("/account/inspections/new");
  const query = await searchParams;

  const properties = await prisma.property.findMany({
    where: { status: "APPROVED", isActive: true },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: { id: true, name: true, city: true, slug: true },
  });

  const preselected = properties.find((entry) => entry.slug === query.property);

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <AccountPageHeader
        eyebrow="Visits"
        title="Request an inspection"
        description="Pick a property and time — the landlord or manager confirms the visit."
        actions={<ButtonLink href="/account/inspections" size="sm" variant="outline">My inspections</ButtonLink>}
      />

      {properties.length === 0 ? (
        <p className="rounded-lg border border-line bg-white p-6 text-[14px] text-ink-600">
          No listings are accepting visits right now. Try again later.
        </p>
      ) : (
        <CustomerActionForm action={requestInspection} submitLabel="Send request" className="rounded-lg border border-line bg-white p-5">
          <Field label="Property" htmlFor="inspect-property" required>
            <Select id="inspect-property" name="propertyId" defaultValue={preselected?.id ?? ""} required>
              <option value="">Choose a property…</option>
              {properties.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} — {entry.city}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preferred date" htmlFor="inspect-date" required>
              <Input id="inspect-date" name="preferredDate" type="date" required />
            </Field>
            <Field label="Time window" htmlFor="inspect-window" required>
              <Select id="inspect-window" name="preferredWindow" required>
                <option value="">Choose…</option>
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
                <option value="EVENING">Evening</option>
              </Select>
            </Field>
          </div>

          <Field label="Phone" htmlFor="inspect-phone" hint="The property uses this to confirm your visit.">
            <Input id="inspect-phone" name="phone" type="tel" defaultValue={user.phone ?? ""} />
          </Field>

          <Field label="Note to the property" htmlFor="inspect-notes" hint="Optional — anything that helps them prepare.">
            <Textarea id="inspect-notes" name="notes" rows={3} />
          </Field>
        </CustomerActionForm>
      )}
    </div>
  );
}
