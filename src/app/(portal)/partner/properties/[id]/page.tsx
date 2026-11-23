import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Callout, EmptyState, InfoRow } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import { PriceInline } from "@/components/ui/price";
import { SubmitPropertyActions } from "@/components/partner/submit-property-actions";
import {
  SeasonalRateForm,
  SeasonalRateList,
  UnitPricingForm,
  type UnitPricingSeed,
} from "@/components/partner/unit-pricing-form";
import { ActionForm } from "@/components/partner/action-form";
import { applyUnitRateToAll } from "@/server/actions/partner-property";
import { AddRoomTypeForm, AddSingleUnitForm } from "@/components/partner/unit-manager";
import { UnitMediaPanel } from "@/components/partner/unit-media-panel";
import { UnitDetailsForm } from "@/components/partner/unit-details-form";
import { PropertyFeesManager } from "@/components/partner/property-fees-manager";
import { PropertyDetailsEditor } from "@/components/partner/property-details-editor";
import { formatMoney } from "@/lib/money";
import { formatDate, describeDuration, toISODate } from "@/lib/dates";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_TONES,
  VERIFICATION_LEVEL_LABELS,
} from "@/lib/constants";

type ManagePropertyPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[]; setup?: string | string[] }>;
};

export default async function ManagePropertyPage({
  params,
  searchParams,
}: ManagePropertyPageProps) {
  const { partner, can } = await requirePartnerContext();
  const { id } = await params;
  const query = await searchParams;
  const setup = Array.isArray(query.setup) ? query.setup[0] : query.setup;

  // Single-flow workspace: everything (details, units, media, pricing, fees)
  // is managed in one view for complete property setup and editing.
  const property = await prisma.property.findFirst({
    where: { id, partnerId: partner.id },
    include: {
      category: true,
      units: {
        include: {
          rate: true,
          category: true,
          seasonalRates: { orderBy: [{ startDate: "asc" }] },
          media: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        },
        orderBy: { sortOrder: "asc" },
      },
      media: { orderBy: { sortOrder: "asc" } },
      amenities: { include: { amenity: true } },
      verificationChecks: true,
      cancellationPolicy: true,
      fees: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!property) notFound();

  const location = [property.area, property.city, property.state].filter(Boolean).join(", ");

  const [roomTypes, categories, amenities, policies] = await Promise.all([
    prisma.roomCategory.findMany({
      where: { propertyId: property.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.propertyCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.amenity.findMany({ where: { isActive: true }, orderBy: [{ group: "asc" }, { name: "asc" }], select: { id: true, name: true, group: true } }),
    prisma.cancellationPolicy.findMany({
      where: { OR: [{ partnerId: null }, { partnerId: partner.id }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const units = property.units;

  const pricingCards = units.map((unit) => {
    const rate = unit.rate;
    const seed: UnitPricingSeed | null = rate
      ? {
          nightlyRate: rate.nightlyRate,
          weeklyRate: rate.weeklyRate,
          monthlyRate: rate.monthlyRate,
          annualRate: rate.annualRate,
          weekendNightlyRate: rate.weekendNightlyRate,
          extraGuestFee: rate.extraGuestFee,
          extraGuestThreshold: rate.extraGuestThreshold,
          cleaningFee: rate.cleaningFee,
          serviceCharge: rate.serviceCharge,
          securityDeposit: rate.securityDeposit,
          minNights: rate.minNights,
          maxNights: rate.maxNights,
        }
      : null;
    const seasons = unit.seasonalRates.map((season) => ({
      id: season.id,
      name: season.name,
      startDate: toISODate(season.startDate),
      endDate: toISODate(season.endDate),
      nightlyRate: season.nightlyRate,
      weeklyRate: season.weeklyRate,
      monthlyRate: season.monthlyRate,
      minNights: season.minNights,
      isPromotion: season.isPromotion,
      label: season.label,
      priority: season.priority,
    }));
    return { unit, seed, seasons };
  });

  const unitsWithRates = units.filter((u) => u.rate).length;
  const unitsWithMedia = units.filter((u) => u.media.length > 0).length;
  const setupSteps = [
    { label: "Property details saved", done: true, href: "#details" },
    { label: "Add at least one unit/room", done: units.length > 0, href: "#units" },
    { label: "Set pricing for each unit", done: units.length > 0 && unitsWithRates === units.length, href: "#pricing" },
    { label: "Add unit photos or 360° tours", done: units.length > 0 && unitsWithMedia > 0, href: "#units" },
    { label: "Configure taxes, caution & fees (optional)", done: property.fees.length > 0, href: "#pricing", optional: true },
  ];

  return (
    <div className="space-y-8">
      <nav className="text-sm text-ink-500">
        <Link href="/partner/properties" className="hover:text-brand-700">Properties</Link>
        <span className="mx-2">/</span>
        <span className="text-ink-800">{property.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={PROPERTY_STATUS_TONES[property.status]} dot>
              {PROPERTY_STATUS_LABELS[property.status]}
            </Badge>
            <Badge tone="neutral">{property.category.name}</Badge>
            {property.verificationBadge ? <Badge tone="success">Verified</Badge> : null}
          </div>
          <h1 className="mt-3 font-display text-3xl text-ink-900">{property.name}</h1>
          <p className="mt-1 text-ink-600">{location}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {property.status === "APPROVED" && property.isActive ? (
            <ButtonLink href={`/properties/${property.slug}`} variant="outline" size="sm">
              View public page
            </ButtonLink>
          ) : (
            <span className="text-sm text-ink-500">Not published yet</span>
          )}
        </div>
      </header>

      {setup === "1" ? (
        <Callout tone="success" title="Property created — complete setup in one place">
          Configure details, add units (with photos), set pricing &amp; fees, then submit for review. Everything for this listing is managed on this page.
        </Callout>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Setup checklist</h2>
        <p className="mt-1 text-sm text-ink-500">Single-flow workspace: add and edit everything for this property here.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {setupSteps.map((step) => (
            <li key={step.label}>
              <a href={step.href} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm hover:bg-ink-50">
                <span className={step.done ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[12px] font-semibold text-emerald-700" : "inline-flex h-5 w-5 items-center justify-center rounded-full border border-line-strong text-[12px] text-ink-400"}>
                  {step.done ? "✓" : ""}
                </span>
                <span className={step.done ? "text-ink-700" : "font-medium text-ink-900"}>{step.label}</span>
                {"optional" in step && step.optional ? <span className="ml-auto text-[12px] text-ink-400">optional</span> : null}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {property.rejectionReason ? (
        <Callout tone="danger" title="RentOps asked for changes">
          {property.rejectionReason}
        </Callout>
      ) : null}
      {property.adminNotes ? (
        <Callout tone="warning" title="Note from RentOps">{property.adminNotes}</Callout>
      ) : null}

      {property.status !== "APPROVED" ? (
        <SubmitPropertyActions propertyId={property.id} status={property.status} />
      ) : null}

      <nav className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-2 border-b border-line bg-white/95 px-1 py-3 backdrop-blur">
        {[
          ["#details", "Details & rules"],
          ["#units", "Units & media"],
          ["#pricing", "Pricing & fees"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-md border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink-700 hover:bg-ink-50">
            {label}
          </a>
        ))}
      </nav>

      <section id="details" className="scroll-mt-24 space-y-6">
        <SectionHeading eyebrow="Setup" title="Property details, rules & amenities" description="Edit all property information in one place — the same fields used when adding and managing this listing." />
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <PropertyDetailsEditor
            property={{
              id: property.id,
              name: property.name,
              headline: property.headline,
              description: property.description,
              categoryId: property.categoryId,
              addressLine1: property.addressLine1,
              addressLine2: property.addressLine2,
              area: property.area,
              city: property.city,
              state: property.state,
              country: property.country,
              postalCode: property.postalCode,
              latitude: property.latitude,
              longitude: property.longitude,
              contactName: property.contactName,
              contactPhone: property.contactPhone,
              contactEmail: property.contactEmail,
              bedrooms: property.bedrooms,
              bathrooms: property.bathrooms,
              maxGuests: property.maxGuests,
              sizeSqm: property.sizeSqm,
              houseRules: property.houseRules,
              cancellationPolicyId: property.cancellationPolicyId,
              checkInFrom: property.checkInFrom,
              checkInTo: property.checkInTo,
              checkOutUntil: property.checkOutUntil,
              smokingAllowed: property.smokingAllowed,
              petsAllowed: property.petsAllowed,
              partiesAllowed: property.partiesAllowed,
              childrenAllowed: property.childrenAllowed,
              minimumAge: property.minimumAge,
              bookingMode: property.bookingMode,
              minNights: property.minNights,
              maxNights: property.maxNights,
              minNoticeHours: property.minNoticeHours,
              advanceBookingDays: property.advanceBookingDays,
              acceptedCheckInDays: property.acceptedCheckInDays,
              dueDiligenceEnabled: property.dueDiligenceEnabled,
              dueDiligenceThresholdDays: property.dueDiligenceThresholdDays,
              mandatoryVerification: property.mandatoryVerification,
              allowPayLater: property.allowPayLater,
              unpaidHoldDays: property.unpaidHoldDays,
            }}
            categories={categories}
            amenities={amenities}
            selectedAmenityIds={property.amenities.map((a) => a.amenityId)}
            policies={policies}
          />
          <div className="space-y-6">
            <section className="rounded-lg border border-line bg-white p-5">
              <h2 className="font-display text-xl text-ink-900">Listing summary</h2>
              <dl className="mt-3">
                <InfoRow label="Verification" value={VERIFICATION_LEVEL_LABELS[property.verificationLevel]} />
                <InfoRow label="Units" value={`${units.length}`} />
                <InfoRow label="Property media" value={`${property.media.length} item(s)`} />
                <InfoRow label="Created" value={formatDate(property.createdAt)} />
              </dl>
            </section>
            <PropertyFeesManager propertyId={property.id} currency={property.currency} fees={property.fees} />
          </div>
        </div>
      </section>

      <section id="units" className="scroll-mt-24 space-y-6">
        <SectionHeading eyebrow="Inventory" title="Units, room types & media" description="Add room types or individual/similar units, upload photos now, and manage 360° tours and per-unit details — all in one place." />
        {can("unit.manage") ? (
          <>
            <Callout tone="info" title="Units & media">
              Create a <strong>room type</strong> to generate many units at once, or add <strong>single/similar units</strong> (with optional photos at creation). Each unit below has its own media panel for photos, floor plans, walkthrough videos, and 360° tours shown to guests.
            </Callout>
            <div className="grid gap-5 lg:grid-cols-2">
              <AddRoomTypeForm propertyId={property.id} />
              <AddSingleUnitForm propertyId={property.id} roomTypes={roomTypes.map((entry) => ({ id: entry.id, name: entry.name }))} />
            </div>
            <section className="rounded-lg border border-line bg-white p-5">
              <h2 className="font-display text-xl text-ink-900">Units {units.length > 0 ? `(${units.length})` : ""}</h2>
              {units.length === 0 ? (
                <p className="mt-2 text-sm text-ink-500">No units yet — add your first room type or unit above.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {roomTypes.length > 0 ? (
                    <ul className="mb-3 flex flex-wrap gap-2">
                      {roomTypes.map((roomType) => (
                        <li key={roomType.id} className="rounded-full border border-line bg-ink-50 px-3 py-1 text-[13px] text-ink-700">
                          {roomType.name}
                          <span className="ml-1.5 text-ink-400">
                            {units.filter((unit) => unit.categoryId === roomType.id).length} unit{units.filter((unit) => unit.categoryId === roomType.id).length === 1 ? "" : "s"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {units.map((unit) => (
                    <div key={unit.id} className="rounded-md border border-line p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-ink-900">
                            {unit.label}
                            <span className="ml-2 text-[13px] font-normal text-ink-500">
                              {unit.status.toLowerCase()} · sleeps {unit.maxGuests} · {unit.bedrooms} bed{unit.bedrooms === 1 ? "" : "s"} · {unit.bathrooms} bath{unit.bathrooms === 1 ? "" : "s"}
                              {unit.category ? ` · ${unit.category.name}` : ""}
                            </span>
                          </p>
                          {unit.rate ? (
                            <p className="mt-0.5 text-[13px] text-brand-700">
                              From {formatMoney(unit.rate.nightlyRate ?? unit.rate.monthlyRate ?? 0, property.currency, { compact: true })} / {unit.rate.nightlyRate ? "night" : "month"}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[13px] text-ink-400">No rate set — configure in Pricing &amp; fees below</p>
                          )}
                        </div>
                        <a href="#pricing" className="text-[13px] font-semibold text-brand-700 hover:underline">Set price ↓</a>
                      </div>
                      <UnitDetailsForm
                        unit={{
                          id: unit.id,
                          label: unit.label,
                          unitNumber: unit.unitNumber,
                          floor: unit.floor,
                          maxGuests: unit.maxGuests,
                          bedrooms: unit.bedrooms,
                          bathrooms: unit.bathrooms,
                          beds: unit.beds,
                          sizeSqm: unit.sizeSqm,
                          status: unit.status as "ACTIVE" | "MAINTENANCE" | "BLOCKED" | "INACTIVE",
                          isBookable: unit.isBookable,
                        }}
                      />
                      <UnitMediaPanel unitId={unit.id} media={unit.media} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <Callout tone="warning" title="Not available to your role">Adding or editing units requires the <strong>unit.manage</strong> permission.</Callout>
        )}
      </section>

      <section id="pricing" className="scroll-mt-24 space-y-6">
        <SectionHeading eyebrow="Pricing" title="Pricing, seasonal rates & fees" description="Set per-unit rates (nightly/weekly/monthly/annual), seasonal/promotional periods, and property-level taxes, caution & custom fees — all in one place." />
        <PropertyFeesManager propertyId={property.id} currency={property.currency} fees={property.fees} />
        {can("rate.manage") ? (
          units.length === 0 ? (
            <EmptyState title="No units yet" description="Add rooms or units above before setting prices — every unit needs a rate before it can be booked." />
          ) : (
            <div className="space-y-5">
              {pricingCards.map(({ unit, seed, seasons }) => (
                <section key={unit.id} className="rounded-lg border border-line bg-white p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-xl text-ink-900">{unit.label}</h2>
                    <p className="text-sm text-ink-500">
                      sleeps {unit.maxGuests} · {unit.bedrooms} bed{unit.bedrooms === 1 ? "" : "s"} · {unit.bathrooms} bath{unit.bathrooms === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="mt-4">
                    <UnitPricingForm unitId={unit.id} rate={seed} />
                    {seed ? (
                      <div className="mt-3">
                        <ActionForm action={applyUnitRateToAll} hidden={{ unitId: unit.id }} submitLabel="Apply this pricing to all units" submitVariant="outline" submitSize="sm">
                          <p className="text-[13px] text-ink-500">Copy this unit’s saved rates and fees to every other unit in this property.</p>
                        </ActionForm>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div className="rounded-lg border border-line bg-white p-4">
                      <h3 className="text-[14px] font-semibold text-ink-900">Seasonal / promotional rates</h3>
                      <p className="mt-1 text-[13px] text-ink-500">Override the unit rate for a date range.</p>
                      <div className="mt-3"><SeasonalRateForm unitId={unit.id} /></div>
                      <div className="mt-3"><SeasonalRateList rates={seasons} /></div>
                    </div>
                    <div className="rounded-lg border border-line bg-white p-4">
                      <h3 className="text-[14px] font-semibold text-ink-900">Current configuration</h3>
                      {unit.rate ? (
                        <dl className="mt-3 space-y-2">
                          <InfoRow label="Nightly" value={formatMoney(unit.rate.nightlyRate ?? 0, property.currency, { compact: true })} />
                          <InfoRow label="Weekend nightly" value={unit.rate.weekendNightlyRate ? formatMoney(unit.rate.weekendNightlyRate, property.currency, { compact: true }) : "—"} />
                          <InfoRow label="Weekly" value={unit.rate.weeklyRate ? formatMoney(unit.rate.weeklyRate, property.currency, { compact: true }) : "—"} />
                          <InfoRow label="Monthly" value={unit.rate.monthlyRate ? formatMoney(unit.rate.monthlyRate, property.currency, { compact: true }) : "—"} />
                          <InfoRow label="Annual" value={unit.rate.annualRate ? formatMoney(unit.rate.annualRate, property.currency, { compact: true }) : "—"} />
                          <InfoRow label="Cleaning" value={formatMoney(unit.rate.cleaningFee, property.currency, { compact: true })} />
                          <InfoRow label="Service charge" value={formatMoney(unit.rate.serviceCharge, property.currency, { compact: true })} />
                          <InfoRow label="Security deposit" value={formatMoney(unit.rate.securityDeposit, property.currency, { compact: true })} />
                          <InfoRow label="Min / max nights" value={`${unit.rate.minNights ?? "—"} / ${unit.rate.maxNights ?? "—"}`} />
                        </dl>
                      ) : (
                        <p className="mt-2 text-sm text-ink-500">No rate configured yet.</p>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )
        ) : (
          <Callout tone="warning" title="Not available to your role">Setting prices requires the <strong>rate.manage</strong> permission.</Callout>
        )}
      </section>
    </div>
  );
}
