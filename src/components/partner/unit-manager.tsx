"use client";

import { ActionForm } from "@/components/partner/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/partner/submit-button";
import { createRoomCategory, createUnit } from "@/server/actions/partner-property";

/**
 * Room-type-based inventory creation.
 *
 * A "room type" (e.g. Deluxe King × 12) creates the matching set of units in
 * one go — that is how a hotel or serviced-aparment partner stocks a whole
 * property. For one-off spaces (a single shortlet apartment) the partner
 * creates the unit directly below.
 */
export function AddRoomTypeForm({ propertyId }: { propertyId: string }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h3 className="font-display text-xl text-ink-900">Add a room type</h3>
      <p className="mt-1 text-sm text-ink-500">
        Name the category, say how many you have, and we create every unit
        (“Deluxe King 1”…“Deluxe King 12”) linked to that room type.
      </p>

      <ActionForm
        action={createRoomCategory}
        hidden={{ propertyId }}
        submitLabel="Create room type &amp; units"
        submitPendingLabel="Creating…"
        className="mt-4 grid gap-4"
      >
        <Field label="Room type name" htmlFor="roomtype-name" required hint="Each unit becomes “{name} 1”, “{name} 2”, …">
          <Input id="roomtype-name" name="name" required placeholder="e.g. Deluxe King" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How many" htmlFor="roomtype-quantity" required>
            <Input id="roomtype-quantity" name="quantity" type="number" min={1} max={200} defaultValue={1} inputMode="numeric" required />
          </Field>
          <Field label="Sleeps" htmlFor="roomtype-maxGuests">
            <Input id="roomtype-maxGuests" name="maxGuests" type="number" min={1} defaultValue={2} inputMode="numeric" />
          </Field>
          <Field label="Bedrooms" htmlFor="roomtype-bedrooms">
            <Input id="roomtype-bedrooms" name="bedrooms" type="number" min={0} defaultValue={1} inputMode="numeric" />
          </Field>
          <Field label="Bathrooms" htmlFor="roomtype-bathrooms">
            <Input id="roomtype-bathrooms" name="bathrooms" type="number" min={0} defaultValue={1} inputMode="numeric" />
          </Field>
          <Field label="Beds" htmlFor="roomtype-beds" hint="Optional — e.g. “1 king”">
            <Input id="roomtype-beds" name="beds" />
          </Field>
          <Field label="Size (m²)" htmlFor="roomtype-size">
            <Input id="roomtype-size" name="sizeSqm" type="number" min={0} step="0.1" inputMode="decimal" />
          </Field>
        </div>

        <Field label="Description" htmlFor="roomtype-description" hint="Optional — what's special about this room type.">
          <Textarea id="roomtype-description" name="description" rows={3} />
        </Field>
      </ActionForm>
    </section>
  );
}

/**
 * One-off unit — for a single apartment or a space that doesn't match any
 * existing room type. Supports creating multiple similar copies and attaching
 * photos at creation time so setup can happen in one pass.
 */
export function AddSingleUnitForm({
  propertyId,
  roomTypes,
}: {
  propertyId: string;
  roomTypes: Array<{ id: string; name: string }>;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h3 className="font-display text-xl text-ink-900">Add unit(s)</h3>
      <p className="mt-1 text-sm text-ink-500">
        Create one unit or multiple similar units with the same details. You can add photos now and manage 360° tours/pricing right after in the lists below.
      </p>

      <ActionForm
        action={createUnit}
        hidden={{ propertyId }}
        submitLabel="Create unit(s)"
        submitPendingLabel="Creating…"
        className="mt-4 grid gap-4"
      >
        <Field label="Unit label / base name" htmlFor="unit-label" required hint="For one unit: e.g. “Apartment 2B”. For multiple: base name (we’ll number them).">
          <Input id="unit-label" name="label" required placeholder="e.g. Apartment 2B or Deluxe Studio" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How many similar units?" htmlFor="unit-quantity" hint="Create multiple units with the same details.">
            <Input id="unit-quantity" name="quantity" type="number" min={1} max={50} defaultValue={1} inputMode="numeric" />
          </Field>
          <Field label="Room type" htmlFor="unit-category" hint="Optional — group with a room type.">
            <Select id="unit-category" name="categoryId" defaultValue="">
              <option value="">None</option>
              {roomTypes.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unit number" htmlFor="unit-number" hint="For a single unit only.">
            <Input id="unit-number" name="unitNumber" placeholder="2B" />
          </Field>
          <Field label="Floor" htmlFor="unit-floor">
            <Input id="unit-floor" name="floor" placeholder="2" />
          </Field>
          <Field label="Sleeps" htmlFor="unit-maxGuests">
            <Input id="unit-maxGuests" name="maxGuests" type="number" min={1} defaultValue={2} inputMode="numeric" />
          </Field>
          <Field label="Bedrooms" htmlFor="unit-bedrooms">
            <Input id="unit-bedrooms" name="bedrooms" type="number" min={0} defaultValue={1} inputMode="numeric" />
          </Field>
          <Field label="Bathrooms" htmlFor="unit-bathrooms">
            <Input id="unit-bathrooms" name="bathrooms" type="number" min={0} defaultValue={1} inputMode="numeric" />
          </Field>
          <Field label="Beds" htmlFor="unit-beds" hint="Optional — e.g. “1 queen”">
            <Input id="unit-beds" name="beds" />
          </Field>
          <Field label="Size (m²)" htmlFor="unit-size">
            <Input id="unit-size" name="sizeSqm" type="number" min={0} step="0.1" inputMode="decimal" />
          </Field>
        </div>

        <div className="rounded-md border border-line bg-ink-50/40 p-3">
          <p className="text-[13px] font-semibold text-ink-900">Photos (optional, added now)</p>
          <p className="mt-0.5 text-[12.5px] text-ink-500">Upload images of this unit/room now. You can add more photos, a 360° tour, or a walkthrough video per unit from the list after saving.</p>
          <input
            id="unit-create-files"
            name="photos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="mt-2 block w-full text-[13px] text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-white hover:file:bg-brand-800"
          />
        </div>
      </ActionForm>
    </section>
  );
}
