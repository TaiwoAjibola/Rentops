"use client";

import { ActionForm } from "@/components/partner/action-form";
import { Field, Input, Select } from "@/components/ui/field";
import { updateUnitDetails, updateUnitStatus } from "@/server/actions/partner-property";

export type UnitDetailsSeed = {
  id: string;
  label: string;
  unitNumber: string | null;
  floor: string | null;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  beds: string | null;
  sizeSqm: number | null;
  status: "ACTIVE" | "MAINTENANCE" | "BLOCKED" | "INACTIVE";
  isBookable: boolean;
};

export function UnitDetailsForm({ unit }: { unit: UnitDetailsSeed }) {
  return (
    <details className="mt-3 rounded-md border border-line bg-ink-50/30">
      <summary className="cursor-pointer list-none px-3 py-2 text-[13px] font-medium text-ink-800 select-none">
        Edit unit details &amp; availability status
      </summary>
      <div className="space-y-4 border-t border-line p-3">
        <ActionForm
          action={updateUnitDetails}
          hidden={{ unitId: unit.id }}
          submitLabel="Save details"
          submitPendingLabel="Saving…"
          submitSize="sm"
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field label="Label" htmlFor={`u-label-${unit.id}`} required className="sm:col-span-2">
            <Input id={`u-label-${unit.id}`} name="label" required defaultValue={unit.label} />
          </Field>
          <Field label="Unit number" htmlFor={`u-num-${unit.id}`}>
            <Input id={`u-num-${unit.id}`} name="unitNumber" defaultValue={unit.unitNumber ?? ""} />
          </Field>
          <Field label="Floor" htmlFor={`u-floor-${unit.id}`}>
            <Input id={`u-floor-${unit.id}`} name="floor" defaultValue={unit.floor ?? ""} />
          </Field>
          <Field label="Sleeps" htmlFor={`u-guests-${unit.id}`}>
            <Input id={`u-guests-${unit.id}`} name="maxGuests" type="number" min={1} defaultValue={unit.maxGuests} />
          </Field>
          <Field label="Bedrooms" htmlFor={`u-bedsr-${unit.id}`}>
            <Input id={`u-bedsr-${unit.id}`} name="bedrooms" type="number" min={0} defaultValue={unit.bedrooms} />
          </Field>
          <Field label="Bathrooms" htmlFor={`u-baths-${unit.id}`}>
            <Input id={`u-baths-${unit.id}`} name="bathrooms" type="number" min={0} defaultValue={unit.bathrooms} />
          </Field>
          <Field label="Beds" htmlFor={`u-beds-${unit.id}`}>
            <Input id={`u-beds-${unit.id}`} name="beds" defaultValue={unit.beds ?? ""} placeholder="e.g. 1 king, 1 sofa" />
          </Field>
          <Field label="Size (m²)" htmlFor={`u-size-${unit.id}`}>
            <Input id={`u-size-${unit.id}`} name="sizeSqm" type="number" min={0} step="0.1" defaultValue={unit.sizeSqm ?? ""} />
          </Field>
        </ActionForm>

        <div className="border-t border-line pt-3">
          <p className="mb-2 text-[13px] font-semibold text-ink-900">Status &amp; bookability</p>
          <ActionForm
            action={updateUnitStatus}
            hidden={{ unitId: unit.id }}
            submitLabel="Update status"
            submitPendingLabel="Updating…"
            submitVariant="outline"
            submitSize="sm"
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field label="Status" htmlFor={`u-status-${unit.id}`}>
              <Select id={`u-status-${unit.id}`} name="status" defaultValue={unit.status}>
                <option value="ACTIVE">Active</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="BLOCKED">Blocked</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </Field>
            <label className="mt-7 flex items-center gap-2 text-[13px] text-ink-700">
              <input type="checkbox" name="isBookable" value="1" defaultChecked={unit.isBookable} />
              Bookable (available for new reservations when active)
            </label>
          </ActionForm>
        </div>
      </div>
    </details>
  );
}
