"use client";

import { ActionForm } from "@/components/partner/action-form";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/partner/submit-button";
import { deleteSeasonalRate, saveUnitRate, createSeasonalRate } from "@/server/actions/partner-property";

export type UnitPricingSeed = {
  nightlyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  annualRate: number | null;
  weekendNightlyRate: number | null;
  extraGuestFee: number;
  extraGuestThreshold: number | null;
  cleaningFee: number;
  serviceCharge: number;
  securityDeposit: number;
  minNights: number | null;
  maxNights: number | null;
};

const EMPTY_SEED: UnitPricingSeed = {
  nightlyRate: null,
  weeklyRate: null,
  monthlyRate: null,
  annualRate: null,
  weekendNightlyRate: null,
  extraGuestFee: 0,
  extraGuestThreshold: null,
  cleaningFee: 0,
  serviceCharge: 0,
  securityDeposit: 0,
  minNights: null,
  maxNights: null,
};

function moneyInput(value: number | null | undefined, fallback = 0) {
  if (value == null) return fallback;
  return String(value);
}

/**
 * Owner price editor for one unit — nightly, weekend, weekly, monthly, annual,
 * add-ons (extra guest, cleaning, service, deposit) and the partner's own
 * min/max stay. Submits through the same `saveUnitRate` server action the
 * booking quote engine reads, so what the owner saves is what guests see.
 */
export function UnitPricingForm({
  unitId,
  rate,
}: {
  unitId: string;
  rate: UnitPricingSeed | null;
}) {
  const seed = rate ?? EMPTY_SEED;

  return (
    <ActionForm
      action={saveUnitRate}
      hidden={{ unitId }}
      submitLabel="Save pricing"
      submitPendingLabel="Saving…"
      className="grid gap-4 rounded-lg border border-line bg-white p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nightly rate (₦)" htmlFor="rate-nightly" hint="Per night. Monthly/weekly/annual prices are configured alongside it.">
          <Input
            id="rate-nightly"
            name="nightlyRate"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.nightlyRate)}
          />
        </Field>
        <Field label="Weekend nightly rate (₦)" htmlFor="rate-weekend" hint="Charged on Friday/Saturday check-in nights when set; otherwise the nightly rate applies.">
          <Input
            id="rate-weekend"
            name="weekendNightlyRate"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.weekendNightlyRate)}
          />
        </Field>
        <Field label="Weekly rate (₦)" htmlFor="rate-weekly" hint="Per 7-night stay. Optional — applied when set.">
          <Input
            id="rate-weekly"
            name="weeklyRate"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.weeklyRate)}
          />
        </Field>
        <Field label="Monthly rate (₦)" htmlFor="rate-monthly" hint="Per 30-night stay — the basis for long leases.">
          <Input
            id="rate-monthly"
            name="monthlyRate"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.monthlyRate)}
          />
        </Field>
        <Field label="Annual rate (₦)" htmlFor="rate-annual" hint="Per 365-night year. Optional.">
          <Input
            id="rate-annual"
            name="annualRate"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.annualRate)}
          />
        </Field>
        <Field label="Extra guest fee (₦)" htmlFor="rate-extra-guest" hint="Per extra guest per night once the threshold is exceeded.">
          <Input
            id="rate-extra-guest"
            name="extraGuestFee"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.extraGuestFee)}
          />
        </Field>
        <Field label="Extra guest threshold" htmlFor="rate-extra-threshold" hint="Included guests before the fee applies. Defaults to the unit's max guests.">
          <Input
            id="rate-extra-threshold"
            name="extraGuestThreshold"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.extraGuestThreshold)}
          />
        </Field>
        <Field label="Cleaning fee (₦)" htmlFor="rate-cleaning" hint="Charged once per reservation.">
          <Input
            id="rate-cleaning"
            name="cleaningFee"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.cleaningFee)}
          />
        </Field>
        <Field label="Service charge (₦)" htmlFor="rate-service" hint="Charged once per reservation.">
          <Input
            id="rate-service"
            name="serviceCharge"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.serviceCharge)}
          />
        </Field>
        <Field label="Security deposit (₦)" htmlFor="rate-deposit" hint="Held on the customer's payment, returned after check-out.">
          <Input
            id="rate-deposit"
            name="securityDeposit"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.securityDeposit)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum nights" htmlFor="rate-min-nights" hint="Your own minimum stay. Applied to new bookings.">
          <Input
            id="rate-min-nights"
            name="minNights"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.minNights)}
          />
        </Field>
        <Field label="Maximum nights" htmlFor="rate-max-nights" hint="No maximum for long leases unless you set one.">
          <Input
            id="rate-max-nights"
            name="maxNights"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            defaultValue={moneyInput(seed.maxNights)}
          />
        </Field>
      </div>

      <div>
        <SubmitButton>Save pricing</SubmitButton>
      </div>
    </ActionForm>
  );
}

/**
 * Seasonal / promotional price periods. Overriding any period replaces the
 * unit rate for those dates only — this is how an owner prices a December peak
 * or holiday week differently from the rest of the year.
 */
export function SeasonalRateForm({ unitId }: { unitId: string }) {
  return (
    <ActionForm
      action={createSeasonalRate}
      hidden={{ unitId }}
      submitLabel="Save seasonal rate"
      submitPendingLabel="Saving…"
      className="grid gap-3 rounded-lg border border-line bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Period name" htmlFor="season-name" required hint="e.g. “December peak”.">
          <Input id="season-name" name="name" required />
        </Field>
        <Field label="Priority" htmlFor="season-priority" hint="Higher priority wins when periods overlap.">
          <Input id="season-priority" name="priority" type="number" min="0" step="1" defaultValue="0" />
        </Field>
        <Field label="Starts" htmlFor="season-start" required>
          <Input id="season-start" name="startDate" type="date" required />
        </Field>
        <Field label="Ends" htmlFor="season-end" required hint="Exclusive — the last discounted night is the day before.">
          <Input id="season-end" name="endDate" type="date" required />
        </Field>
        <Field label="Nightly rate (₦)" htmlFor="season-nightly" required>
          <Input id="season-nightly" name="nightlyRate" type="number" min="0" step="1" inputMode="numeric" required />
        </Field>
        <Field label="Weekly rate (₦)" htmlFor="season-weekly">
          <Input id="season-weekly" name="weeklyRate" type="number" min="0" step="1" inputMode="numeric" />
        </Field>
        <Field label="Monthly rate (₦)" htmlFor="season-monthly">
          <Input id="season-monthly" name="monthlyRate" type="number" min="0" step="1" inputMode="numeric" />
        </Field>
        <Field label="Minimum nights" htmlFor="season-min-nights">
          <Input id="season-min-nights" name="minNights" type="number" min="1" step="1" inputMode="numeric" />
        </Field>
      </div>
      <Field label="Promotion label" htmlFor="season-label" hint="Optional — shown publicly as a “Special offer”.">
        <Input id="season-label" name="label" />
      </Field>
      <Field label="Promotion" htmlFor="season-promotion">
        <span className="flex items-center gap-2 pt-2">
          <input
            id="season-promotion"
            name="isPromotion"
            type="checkbox"
            className="h-4 w-4 rounded border-line-strong text-brand-700 accent-brand-700"
          />
          <label htmlFor="season-promotion" className="text-[13px] font-medium text-ink-700">
            Mark as a promotion
          </label>
        </span>
      </Field>
      <div>
        <SubmitButton>Save seasonal rate</SubmitButton>
      </div>
    </ActionForm>
  );
}

export type SeasonalRateRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  nightlyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  minNights: number | null;
  isPromotion: boolean;
  label: string | null;
  priority: number;
};

/**
 * Removes a seasonal / promotion period once it is no longer needed.
 */
export function SeasonalRateList({ rates }: { rates: SeasonalRateRow[] }) {
  if (rates.length === 0) {
    return <p className="mt-2 text-sm text-ink-500">No seasonal periods yet.</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {rates.map((season) => (
        <li
          key={season.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900">
              {season.name}
              {season.isPromotion ? " · promotion" : ""}
            </p>
            <p className="text-xs text-ink-500">
              {season.startDate} → {season.endDate}
              {season.label ? ` · ${season.label}` : ""}
            </p>
          </div>
          <ActionForm
            action={deleteSeasonalRate}
            hidden={{ rateId: season.id }}
            submitLabel="Delete"
            submitVariant="outline"
            submitSize="sm"
            showStatus={false}
          />
        </li>
      ))}
    </ul>
  );
}
