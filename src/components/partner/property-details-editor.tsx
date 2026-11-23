"use client";

import { ActionForm } from "@/components/partner/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  saveBookingRules,
  savePropertyAmenities,
  savePropertyCapacity,
  savePropertyPolicies,
  updatePropertyBasics,
} from "@/server/actions/partner-properties";

type Category = { id: string; name: string };
type Amenity = { id: string; name: string; group: string | null };
type Policy = { id: string; name: string };

type Property = {
  id: string;
  name: string;
  headline: string | null;
  description: string;
  categoryId: string;
  addressLine1: string;
  addressLine2: string | null;
  area: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  sizeSqm: number | null;
  houseRules: string | null;
  cancellationPolicyId: string | null;
  checkInFrom: string | null;
  checkInTo: string | null;
  checkOutUntil: string | null;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  partiesAllowed: boolean;
  childrenAllowed: boolean;
  minimumAge: number | null;
  bookingMode: "INSTANT" | "APPROVAL";
  minNights: number;
  maxNights: number | null;
  minNoticeHours: number;
  advanceBookingDays: number;
  acceptedCheckInDays: string | null;
  dueDiligenceEnabled: boolean;
  dueDiligenceThresholdDays: number | null;
  mandatoryVerification: boolean;
  allowPayLater: boolean;
  unpaidHoldDays: number;
};

const WEEKDAYS = [
  { value: "0", label: "Sun" },
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
];

export function PropertyDetailsEditor({
  property,
  categories,
  amenities,
  selectedAmenityIds,
  policies,
}: {
  property: Property;
  categories: Category[];
  amenities: Amenity[];
  selectedAmenityIds: string[];
  policies: Policy[];
}) {
  const accepted = new Set((property.acceptedCheckInDays ?? "").split(",").map((v) => v.trim()).filter(Boolean));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Basics &amp; location</h2>
        <p className="mt-1 text-sm text-ink-600">Keep this consistent with what guests see — same details you set when adding the property.</p>
        <ActionForm action={updatePropertyBasics} hidden={{ propertyId: property.id }} submitLabel="Save details" className="mt-4 grid gap-4">
          <Field label="Property name" htmlFor="edit-name" required>
            <Input id="edit-name" name="name" required defaultValue={property.name} />
          </Field>
          <Field label="Headline" htmlFor="edit-headline">
            <Input id="edit-headline" name="headline" defaultValue={property.headline ?? ""} />
          </Field>
          <Field label="Description" htmlFor="edit-desc" required hint="Minimum 40 characters.">
            <Textarea id="edit-desc" name="description" required rows={5} defaultValue={property.description} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address line 1" htmlFor="edit-addr1" required>
              <Input id="edit-addr1" name="addressLine1" required defaultValue={property.addressLine1} />
            </Field>
            <Field label="Address line 2" htmlFor="edit-addr2">
              <Input id="edit-addr2" name="addressLine2" defaultValue={property.addressLine2 ?? ""} />
            </Field>
            <Field label="Area" htmlFor="edit-area">
              <Input id="edit-area" name="area" defaultValue={property.area ?? ""} />
            </Field>
            <Field label="City" htmlFor="edit-city" required>
              <Input id="edit-city" name="city" required defaultValue={property.city} />
            </Field>
            <Field label="State" htmlFor="edit-state" required>
              <Input id="edit-state" name="state" required defaultValue={property.state} />
            </Field>
            <Field label="Country" htmlFor="edit-country">
              <Input id="edit-country" name="country" defaultValue={property.country} />
            </Field>
            <Field label="Postal code" htmlFor="edit-postal">
              <Input id="edit-postal" name="postalCode" defaultValue={property.postalCode ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact name" htmlFor="edit-cname">
              <Input id="edit-cname" name="contactName" defaultValue={property.contactName ?? ""} />
            </Field>
            <Field label="Contact phone" htmlFor="edit-cphone">
              <Input id="edit-cphone" name="contactPhone" defaultValue={property.contactPhone ?? ""} />
            </Field>
            <Field label="Contact email" htmlFor="edit-cemail" className="sm:col-span-2">
              <Input id="edit-cemail" name="contactEmail" type="email" defaultValue={property.contactEmail ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Latitude" htmlFor="edit-lat">
              <Input id="edit-lat" name="latitude" inputMode="decimal" defaultValue={property.latitude ?? ""} />
            </Field>
            <Field label="Longitude" htmlFor="edit-lng">
              <Input id="edit-lng" name="longitude" inputMode="decimal" defaultValue={property.longitude ?? ""} />
            </Field>
          </div>
        </ActionForm>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Capacity</h2>
        <ActionForm action={savePropertyCapacity} hidden={{ propertyId: property.id }} submitLabel="Save capacity" className="mt-4 grid gap-4 sm:grid-cols-4">
          <Field label="Bedrooms" htmlFor="cap-bedrooms"><Input id="cap-bedrooms" name="bedrooms" type="number" min="0" defaultValue={property.bedrooms} /></Field>
          <Field label="Bathrooms" htmlFor="cap-bathrooms"><Input id="cap-bathrooms" name="bathrooms" type="number" min="0" defaultValue={property.bathrooms} /></Field>
          <Field label="Max guests" htmlFor="cap-guests"><Input id="cap-guests" name="maxGuests" type="number" min="1" defaultValue={property.maxGuests} /></Field>
          <Field label="Size (m²)" htmlFor="cap-size"><Input id="cap-size" name="sizeSqm" type="number" min="0" step="0.1" defaultValue={property.sizeSqm ?? ""} /></Field>
        </ActionForm>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Policies &amp; house rules</h2>
        <ActionForm action={savePropertyPolicies} hidden={{ propertyId: property.id }} submitLabel="Save policies" className="mt-4 grid gap-4">
          <Field label="House rules" htmlFor="pol-rules"><Textarea id="pol-rules" name="houseRules" rows={4} defaultValue={property.houseRules ?? ""} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Check-in from" htmlFor="pol-in-from"><Input id="pol-in-from" name="checkInFrom" placeholder="14:00" defaultValue={property.checkInFrom ?? ""} /></Field>
            <Field label="Check-in until" htmlFor="pol-in-to"><Input id="pol-in-to" name="checkInTo" placeholder="22:00" defaultValue={property.checkInTo ?? ""} /></Field>
            <Field label="Check-out by" htmlFor="pol-out"><Input id="pol-out" name="checkOutUntil" placeholder="12:00" defaultValue={property.checkOutUntil ?? ""} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cancellation policy" htmlFor="pol-cancel">
              <Select id="pol-cancel" name="cancellationPolicyId" defaultValue={property.cancellationPolicyId ?? ""}>
                <option value="">None selected</option>
                {policies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Minimum age" htmlFor="pol-age"><Input id="pol-age" name="minimumAge" type="number" min="0" defaultValue={property.minimumAge ?? ""} /></Field>
          </div>
          <div className="flex flex-wrap gap-4 text-[13px] text-ink-700">
            {([
              ["smokingAllowed", "Smoking allowed", property.smokingAllowed],
              ["petsAllowed", "Pets allowed", property.petsAllowed],
              ["partiesAllowed", "Parties allowed", property.partiesAllowed],
              ["childrenAllowed", "Children allowed", property.childrenAllowed],
            ] as const).map(([name, label, checked]) => (
              <label key={name} className="flex items-center gap-2">
                <input type="checkbox" name={name} value="1" defaultChecked={checked} className="h-4 w-4 rounded border-line-strong" />
                {label}
              </label>
            ))}
          </div>
        </ActionForm>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Booking rules &amp; payment</h2>
        <p className="mt-1 text-sm text-ink-600">Control how guests can book, including whether they can reserve without paying immediately.</p>
        <ActionForm action={saveBookingRules} hidden={{ propertyId: property.id }} submitLabel="Save booking rules" className="mt-4 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Booking mode" htmlFor="br-mode">
              <Select id="br-mode" name="bookingMode" defaultValue={property.bookingMode}>
                <option value="INSTANT">Instant booking</option>
                <option value="APPROVAL">Approval required</option>
              </Select>
            </Field>
            <Field label="Minimum nights" htmlFor="br-min"><Input id="br-min" name="minNights" type="number" min="1" defaultValue={property.minNights} /></Field>
            <Field label="Maximum nights" htmlFor="br-max" hint="Leave empty for no limit."><Input id="br-max" name="maxNights" type="number" min="1" defaultValue={property.maxNights ?? ""} /></Field>
            <Field label="Minimum notice (hours)" htmlFor="br-notice"><Input id="br-notice" name="minNoticeHours" type="number" min="0" defaultValue={property.minNoticeHours} /></Field>
            <Field label="Advance booking window (days)" htmlFor="br-advance"><Input id="br-advance" name="advanceBookingDays" type="number" min="1" defaultValue={property.advanceBookingDays} /></Field>
            <Field label="Due diligence threshold (days)" htmlFor="br-dd"><Input id="br-dd" name="dueDiligenceThresholdDays" type="number" min="0" defaultValue={property.dueDiligenceThresholdDays ?? ""} /></Field>
          </div>
          <div className="rounded-md border border-line p-3">
            <p className="text-[13px] font-semibold text-ink-900">Reserve without payment (hold)</p>
            <label className="mt-2 flex items-center gap-2 text-[13px] text-ink-700">
              <input type="checkbox" name="allowPayLater" value="1" defaultChecked={property.allowPayLater} className="h-4 w-4 rounded border-line-strong" />
              Allow guests to reserve now and pay later
            </label>
            <div className="mt-2 max-w-xs">
              <Field label="Hold for (days)" htmlFor="br-hold" hint="If unpaid by the deadline, the reservation is released.">
                <Input id="br-hold" name="unpaidHoldDays" type="number" min="0" max="30" defaultValue={property.unpaidHoldDays} />
              </Field>
            </div>
          </div>
          <fieldset>
            <legend className="text-[13px] font-medium text-ink-700">Accepted check-in days (leave all unchecked to allow any day)</legend>
            <div className="mt-2 flex flex-wrap gap-3 text-[13px] text-ink-700">
              {WEEKDAYS.map((day) => (
                <label key={day.value} className="flex items-center gap-1.5">
                  <input type="checkbox" name="acceptedCheckInDays" value={day.value} defaultChecked={accepted.has(day.value)} className="h-4 w-4 rounded border-line-strong" />
                  {day.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-4 text-[13px] text-ink-700">
            <label className="flex items-center gap-2"><input type="checkbox" name="dueDiligenceEnabled" value="1" defaultChecked={property.dueDiligenceEnabled} className="h-4 w-4 rounded border-line-strong" />Due diligence enabled</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="mandatoryVerification" value="1" defaultChecked={property.mandatoryVerification} className="h-4 w-4 rounded border-line-strong" />Mandatory verification</label>
          </div>
        </ActionForm>
      </section>

      {amenities.length > 0 ? (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Amenities</h2>
          <ActionForm action={savePropertyAmenities} hidden={{ propertyId: property.id }} submitLabel="Save amenities" className="mt-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {amenities.map((amenity) => (
                <label key={amenity.id} className="flex items-center gap-2 text-[13px] text-ink-700">
                  <input type="checkbox" name="amenityIds" value={amenity.id} defaultChecked={selectedAmenityIds.includes(amenity.id)} className="h-4 w-4 rounded border-line-strong" />
                  {amenity.name}
                </label>
              ))}
            </div>
          </ActionForm>
        </section>
      ) : null}
    </div>
  );
}
