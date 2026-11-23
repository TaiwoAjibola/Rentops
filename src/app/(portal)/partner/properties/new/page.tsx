import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { ActionForm } from "@/components/partner/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/field";
import { createPropertyBasics } from "@/server/actions/partner-properties";
import { NIGERIAN_STATES, LAGOS_AREAS } from "@/lib/constants";

export default async function NewPropertyPage() {
  await requirePartnerContext();

  const categories = await prisma.propertyCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Step 1"
        title="Add a property"
        description="Capture the core details in one place. After creating, you’ll manage units, photos/360° tours, pricing, taxes/caution/custom fees, and booking rules in the property workspace."
      />

      <div className="rounded-lg border border-line bg-white p-5">
        <ActionForm action={createPropertyBasics} submitLabel="Create property">
          <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="name">
            Property name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="e.g. Grand Residences Hotel, Lekki"
            className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900"
          />

          <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="categoryId">
            Category
          </label>
          <Select id="categoryId" name="categoryId" required defaultValue="">
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="headline">
            Headline <span className="text-ink-400">(optional)</span>
          </label>
          <input
            id="headline"
            name="headline"
            placeholder="One line that sells this property"
            className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900"
          />

          <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="description">
            Description
          </label>
          <Textarea
            id="description"
            name="description"
            required
            placeholder="At least a couple of sentences — what makes this property a good stay?"
          />
          <p className="mt-1 text-[13px] text-ink-500">Minimum 40 characters.</p>

          <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="addressLine1">
            Street address
          </label>
          <input
            id="addressLine1"
            name="addressLine1"
            required
            placeholder="12 Admiralty Way"
            className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900"
          />

          <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="addressLine2">
            Address line 2 <span className="text-ink-400">(optional)</span>
          </label>
          <input
            id="addressLine2"
            name="addressLine2"
            className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900"
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="area">
                Area
              </label>
              <input
                id="area"
                name="area"
                list="lagos-areas"
                placeholder="Lekki Phase 1"
                className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900"
              />
              <datalist id="lagos-areas">
                {LAGOS_AREAS.map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="city">
                City
              </label>
              <input
                id="city"
                name="city"
                required
                defaultValue="Lagos"
                className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="state">
                State
              </label>
              <Select id="state" name="state" required defaultValue="Lagos">
                {NIGERIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="country">Country</label>
              <input id="country" name="country" defaultValue="Nigeria" className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="postalCode">
                Postal code <span className="text-ink-400">(optional)</span>
              </label>
              <input id="postalCode" name="postalCode" className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="contactName">Contact name <span className="text-ink-400">(optional)</span></label>
              <input id="contactName" name="contactName" className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="contactPhone">Contact phone <span className="text-ink-400">(optional)</span></label>
              <input id="contactPhone" name="contactPhone" className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="contactEmail">Contact email <span className="text-ink-400">(optional)</span></label>
              <input id="contactEmail" name="contactEmail" type="email" className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900" />
            </div>
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer text-[13px] font-medium text-brand-700">
              Add map coordinates (optional)
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="latitude">
                  Latitude
                </label>
                <input
                  id="latitude"
                  name="latitude"
                  inputMode="decimal"
                  placeholder="6.4301"
                  className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="longitude">
                  Longitude
                </label>
                <input
                  id="longitude"
                  name="longitude"
                  inputMode="decimal"
                  placeholder="3.4588"
                  className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900"
                />
              </div>
            </div>
            <p className="mt-1 text-[13px] text-ink-500">Provide both or leave both empty.</p>
          </details>
        </ActionForm>
      </div>
    </div>
  );
}
