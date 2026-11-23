"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarRange, Loader2, Lock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { Callout } from "@/components/ui/data";
import { PriceBreakdown } from "@/components/ui/price";
import { UnitPicker } from "@/components/public/unit-picker";
import { previewStay, startBooking, type StayPreview } from "@/server/actions/booking";
import { addDays, describeDuration, toISODate, toUtcDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { VERIFICATION_TYPE_LABELS } from "@/lib/constants";
import type { VerificationType } from "@prisma/client";
import type { UnitSummary } from "@/components/public/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Booking widget.
 *
 * Every figure shown here comes from `quoteBooking` via the `previewStay` action
 * — nothing is estimated client-side — and the stay limits displayed are the
 * partner's own configured minimum and maximum nights.
 */
export function BookingWidget({
  propertyId,
  propertySlug,
  propertyName,
  currency = "NGN",
  bookingMode,
  instantBooking,
  minNights,
  maxNights,
  acceptedCheckInDays,
  maxGuests,
  units,
  defaultCheckIn,
  defaultCheckOut,
  defaultGuests = 1,
  allowPayLater = false,
  unpaidHoldDays = 2,
}: {
  propertyId: string;
  propertySlug: string;
  propertyName: string;
  currency?: string;
  bookingMode: "INSTANT" | "APPROVAL";
  instantBooking: boolean;
  minNights: number;
  maxNights: number | null;
  acceptedCheckInDays?: string | null;
  maxGuests: number;
  units: UnitSummary[];
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultGuests?: number;
  allowPayLater?: boolean;
  unpaidHoldDays?: number;
}) {
  const firstUnit = units.find((unit) => unit.available) ?? units[0];

  const [unitId, setUnitId] = useState(firstUnit?.id ?? "");
  const [checkIn, setCheckIn] = useState(defaultCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(defaultCheckOut ?? "");
  const [guests, setGuests] = useState(Math.min(defaultGuests, maxGuests) || 1);
  const [promotionCode, setPromotionCode] = useState("");
  const [paymentOption, setPaymentOption] = useState<"PAY_NOW" | "PAY_LATER">("PAY_NOW");

  const [preview, setPreview] = useState<StayPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [formState, formAction, submitting] = useActionState(startBooking, null);

  const selectedUnit = units.find((unit) => unit.id === unitId);
  const guestLimit = Math.max(1, selectedUnit?.maxGuests ?? maxGuests);

  useEffect(() => {
    if (!unitId || !checkIn || !checkOut) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    previewStay({ propertyId, unitId, checkIn, checkOut, guests, promotionCode: promotionCode || null })
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch(() => {
        if (!cancelled) setPreview({ ok: false, error: "We could not price those dates. Please try again." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId, unitId, checkIn, checkOut, guests, promotionCode]);

  const approval = bookingMode === "APPROVAL" || !instantBooking;
  const quote = preview?.ok ? preview.quote : null;
  const dueDiligence = preview?.ok ? preview.dueDiligence : null;
  const canReserveWithoutPay = !approval && allowPayLater && unpaidHoldDays > 0;

  const acceptedDays = (acceptedCheckInDays ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-600">
            {approval ? "Request to book" : "Instant booking"}
          </p>
          <p className="mt-1 font-display text-xl text-ink-900">
            {quote ? formatMoney(quote.grossAmount, currency, { compact: true }) : "Choose your dates"}
          </p>
          {quote ? (
            <p className="mt-0.5 text-[12.5px] text-ink-500">
              for {describeDuration(quote.nights)} · {quote.priceBasisLabel}
            </p>
          ) : (
            <p className="mt-0.5 text-[12.5px] text-ink-500">Live price updates as you choose</p>
          )}
        </div>
        {loading ? <Loader2 className="mt-1 h-4 w-4 animate-spin text-brand-600" aria-hidden /> : null}
      </div>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="propertySlug" value={propertySlug} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="widget-check-in" className="text-[12px]">
              Check in
            </Label>
            <input
              id="widget-check-in"
              name="checkIn"
              type="date"
              required
              value={checkIn}
              min={defaultCheckIn ?? undefined}
              onChange={(event) => {
                const next = event.target.value;
                setCheckIn(next);
                if (checkOut && next >= checkOut) setCheckOut(toISODate(addDays(toUtcDate(next), minNights || 1)));
              }}
              className="h-10 w-full rounded-md border border-line-strong bg-white px-2.5 text-[13.5px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            />
          </div>
          <div>
            <Label htmlFor="widget-check-out" className="text-[12px]">
              Check out
            </Label>
            <input
              id="widget-check-out"
              name="checkOut"
              type="date"
              required
              value={checkOut}
              min={checkIn || undefined}
              onChange={(event) => setCheckOut(event.target.value)}
              className="h-10 w-full rounded-md border border-line-strong bg-white px-2.5 text-[13.5px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            />
          </div>
        </div>

        <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-500">
          <CalendarRange className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            This property accepts stays from {minNights} night{minNights === 1 ? "" : "s"}
            {maxNights != null ? ` and up to ${maxNights} nights` : ""}.
            {acceptedDays.length > 0 && acceptedDays.length < 7
              ? ` Check-ins accepted ${acceptedDays.sort((a, b) => a - b).map((day) => DAY_NAMES[day]).join(", ")}.`
              : ""}
          </span>
        </p>

        <div>
          <Label htmlFor="widget-guests" className="text-[12px]">
            Guests
          </Label>
          <Select
            id="widget-guests"
            name="guests"
            value={guests}
            onChange={(event) => setGuests(Number(event.target.value))}
            className="h-10 text-[13.5px]"
          >
            {Array.from({ length: guestLimit }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count} guest{count === 1 ? "" : "s"}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="widget-unit" className="text-[12px]">
            Accommodation
          </Label>
          <div className="mt-1.5">
            <UnitPicker
              units={units}
              value={unitId}
              onChange={(next) => {
                setUnitId(next);
                const unit = units.find((entry) => entry.id === next);
                if (unit && guests > unit.maxGuests) setGuests(unit.maxGuests);
              }}
              name="unitId"
            />
          </div>
        </div>

        {preview && !preview.ok ? <FormError>{preview.error}</FormError> : null}

        {preview?.ok && preview.issues.length > 0 ? (
          <div className="rounded-md border border-warning/25 bg-warning-soft px-3.5 py-3 text-[12.5px] text-warning">
            <ul className="space-y-1">
              {preview.issues.map((issue) => (
                <li key={issue} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {quote ? (
          <div className="rounded-md border border-line bg-ink-50/60 p-4">
            <PriceBreakdown
              currency={currency}
              rows={[
                { label: `Accommodation · ${describeDuration(quote.nights)}`, amount: quote.accommodationSubtotal },
                ...(quote.extraGuestCharges > 0 ? [{ label: "Extra guests", amount: quote.extraGuestCharges }] : []),
                ...(quote.cleaningFee > 0 ? [{ label: "Cleaning fee", amount: quote.cleaningFee }] : []),
                ...(quote.serviceCharge > 0 ? [{ label: "Service charge", amount: quote.serviceCharge }] : []),
                ...((quote.feeLines ?? [])
                  .filter((fee) => !fee.isVariable && fee.amount > 0)
                  .map((fee) => ({
                    label: `${fee.name}${fee.kind === "CAUTION_DEPOSIT" || fee.isRefundable ? " (refundable)" : ""}`,
                    amount: fee.amount,
                  }))),
                ...(quote.discountAmount > 0
                  ? [{ label: `Discount${quote.promotionCode ? ` · ${quote.promotionCode}` : ""}`, amount: -quote.discountAmount, muted: true }]
                  : []),
              ]}
              total={{ label: paymentOption === "PAY_LATER" ? "Total due" : "Total due today", amount: quote.grossAmount }}
            />
            {(quote.feeLines ?? []).some((fee) => fee.isVariable) ? (
              <p className="mt-2 text-[12px] text-ink-600">
                Additional fees (amount confirmed later): {(quote.feeLines ?? []).filter((fee) => fee.isVariable).map((fee) => fee.name).join(", ")}.
              </p>
            ) : null}
            <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
              Averages {formatMoney(quote.displayRate, currency, { compact: true })} {quote.priceBasisLabel}.
              {quote.securityDeposit > 0
                ? ` A refundable security deposit of ${formatMoney(quote.securityDeposit, currency, { compact: true })} is arranged directly with the property.`
                : ""}
            </p>
          </div>
        ) : null}

        {canReserveWithoutPay ? (
          <fieldset className="rounded-md border border-line p-3.5">
            <legend className="px-1 text-[13px] font-semibold text-ink-900">How would you like to secure this booking?</legend>
            <div className="mt-2 space-y-2 text-[13px] text-ink-700">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="paymentOption"
                  value="PAY_NOW"
                  checked={paymentOption === "PAY_NOW"}
                  onChange={() => setPaymentOption("PAY_NOW")}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-ink-900">Pay now</span>
                  <span className="block text-ink-500">Complete payment now to confirm your stay immediately.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="paymentOption"
                  value="PAY_LATER"
                  checked={paymentOption === "PAY_LATER"}
                  onChange={() => setPaymentOption("PAY_LATER")}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-ink-900">Reserve now, pay later</span>
                  <span className="block text-ink-500">
                    We’ll hold these dates for {unpaidHoldDays} day{unpaidHoldDays === 1 ? "" : "s"}. Pay before the hold expires or the reservation is released.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
        ) : (
          <input type="hidden" name="paymentOption" value="PAY_NOW" />
        )}

        {dueDiligence?.required ? (
          <Callout tone={dueDiligence.mandatory ? "warning" : "info"} title="Additional checks for longer stays">
            <p>{dueDiligence.message}</p>
            {dueDiligence.verificationTypes.length > 0 ? (
              <p className="mt-1.5">
                Suggested checks:{" "}
                {dueDiligence.verificationTypes
                  .map((type) => VERIFICATION_TYPE_LABELS[type as VerificationType] ?? String(type))
                  .join(", ")}
              </p>
            ) : null}
            {dueDiligence.chargeMinor > 0 ? (
              <p className="mt-1.5">
                Verification fee {formatMoney(dueDiligence.chargeMinor, currency)}.
              </p>
            ) : null}
          </Callout>
        ) : null}

        <details className="rounded-md border border-line bg-white px-3.5 py-3">
          <summary className="cursor-pointer text-[13px] font-medium text-ink-800">
            Add a note, purpose of stay or promo code
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <Label htmlFor="widget-purpose" className="text-[12px]">
                Purpose of stay
              </Label>
              <Select id="widget-purpose" name="purposeOfStay" defaultValue="" className="h-10 text-[13.5px]">
                <option value="">Prefer not to say</option>
                <option value="LEISURE">Holiday / leisure</option>
                <option value="BUSINESS">Business travel</option>
                <option value="RELOCATION">Relocation</option>
                <option value="STUDY">Study</option>
                <option value="PROJECT">Project work</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="widget-requests" className="text-[12px]">
                Special requests
              </Label>
              <Textarea
                id="widget-requests"
                name="specialRequests"
                rows={3}
                placeholder="Arrival time, airport pickup, cot needed…"
                className="min-h-20 text-[13.5px]"
              />
            </div>
            <div>
              <Label htmlFor="widget-promo" className="text-[12px]">
                Promo code
              </Label>
              <Input
                id="widget-promo"
                name="promotionCode"
                value={promotionCode}
                onChange={(event) => setPromotionCode(event.target.value.toUpperCase())}
                placeholder="e.g. LAGOS15"
                className="h-10 text-[13.5px] uppercase"
              />
            </div>
          </div>
        </details>

        {formState?.error ? <FormError>{formState.error}</FormError> : null}

        <Button type="submit" size="lg" className="w-full" disabled={submitting || units.length === 0}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Reserving…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" aria-hidden />
              {approval ? "Request this stay" : paymentOption === "PAY_LATER" ? "Reserve now, pay later" : "Reserve & continue"}
            </>
          )}
        </Button>

        <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden />
          <span>
            {approval
              ? `The property partner reviews this request before payment is taken. Nothing is charged until they approve it and you complete checkout for ${propertyName}.`
              : paymentOption === "PAY_LATER"
                ? `Your dates are held for ${unpaidHoldDays} day${unpaidHoldDays === 1 ? "" : "s"} without payment. Pay before the hold expires to confirm ${propertyName}, or the reservation is released for others.`
                : "You confirm and pay on the next step. RentOps releases the partner's payout after a verified check-in."}
          </span>
        </p>

        <p className="text-[12px] text-ink-500">
          Need to see it first?{" "}
          <Link href={`/account/inspections/new?property=${propertySlug}`} className="font-medium text-brand-700 underline underline-offset-4">
            Request a physical inspection
          </Link>{" "}
          or{" "}
          <Link href={`/account/messages/new?property=${propertySlug}`} className="font-medium text-brand-700 underline underline-offset-4">
            ask the property a question
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
