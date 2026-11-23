import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, InfoRow } from "@/components/ui/data";
import { Rating } from "@/components/ui/avatar";
import { PriceInline } from "@/components/ui/price";
import { getPropertyBySlug, getPropertyBySlugAnyStatus } from "@/lib/properties";
import { getCurrentUser } from "@/lib/auth/session";
import { BookingWidget } from "@/components/public/booking-widget";
import { PublicUnitMedia } from "@/components/public/public-unit-media";
import { PropertyGallery, type GalleryItem } from "@/components/public/property-gallery";
import { VirtualTour } from "@/components/public/virtual-tour";
import { parseTourMeta, type UnitSummary } from "@/components/public/types";
import { PROPERTY_STATUS_LABELS, PROPERTY_STATUS_TONES, RATE_BASIS_LABELS } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { describeDuration } from "@/lib/dates";

function buildRates(rate: {
  nightlyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
  annualRate: number | null;
} | null): UnitSummary["rates"] {
  if (!rate) return [];
  const rates: UnitSummary["rates"] = [];
  if (rate.nightlyRate != null) {
    rates.push({ basis: "NIGHTLY", amount: rate.nightlyRate, basisLabel: RATE_BASIS_LABELS.NIGHTLY });
  }
  if (rate.weeklyRate != null) {
    rates.push({ basis: "WEEKLY", amount: rate.weeklyRate, basisLabel: RATE_BASIS_LABELS.WEEKLY });
  }
  if (rate.monthlyRate != null) {
    rates.push({ basis: "MONTHLY", amount: rate.monthlyRate, basisLabel: RATE_BASIS_LABELS.MONTHLY });
  }
  if (rate.annualRate != null) {
    rates.push({ basis: "ANNUAL", amount: rate.annualRate, basisLabel: RATE_BASIS_LABELS.ANNUAL });
  }
  return rates;
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property) {
    // The listing exists but is not published yet — say so instead of a dead 404.
    const unpublished = await getPropertyBySlugAnyStatus(slug);
    if (!unpublished) notFound();

    return (
      <div className="container-page max-w-2xl py-20 text-center">
        <Badge tone={PROPERTY_STATUS_TONES[unpublished.status]} dot>
          {PROPERTY_STATUS_LABELS[unpublished.status]}
        </Badge>
        <h1 className="mt-4 font-display text-3xl text-ink-900">{unpublished.name}</h1>
        <p className="mt-3 text-ink-600">
          This listing is not published yet. It becomes visible on RentOps once our team has
          reviewed and approved it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/search">Browse available places</ButtonLink>
        </div>
      </div>
    );
  }

  const images = property.media.filter((m) => m.type === "IMAGE");
  const units = property.units.filter((u) => u.isBookable && u.status === "ACTIVE");
  const location = [property.area, property.city, property.state].filter(Boolean).join(", ");
  const user = await getCurrentUser();

  const unitSummaries: UnitSummary[] = units.map((unit) => {
    const preview = unit.media.find((m) => m.type === "IMAGE" || m.type === "FLOOR_PLAN") ?? unit.media[0] ?? null;
    const hasTour = unit.media.some((m) => m.type === "VIRTUAL_TOUR" || m.type === "VIRTUAL_TOUR_360");
    return {
      id: unit.id,
      label: unit.label,
      unitNumber: unit.unitNumber,
      floor: unit.floor,
      categoryName: unit.category?.name ?? null,
      maxGuests: unit.maxGuests,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      beds: unit.beds,
      sizeSqm: unit.sizeSqm,
      minNights: unit.rate?.minNights ?? property.minNights,
      maxNights: unit.rate?.maxNights ?? property.maxNights,
      rates: buildRates(unit.rate),
      availableFrom: null,
      available: true,
      previewImageUrl: preview?.url ?? null,
      mediaCount: unit.media.length,
      hasTour,
    };
  });

  function youtubeId(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
      if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    } catch { return null; }
    return null;
  }

  const galleryItems: GalleryItem[] = property.media.map((m) => {
    if (m.type === "YOUTUBE") return { id: m.id, kind: "youtube" as const, url: m.url, youtubeId: youtubeId(m.url), caption: m.caption };
    if (m.type === "VIDEO") return { id: m.id, kind: "video" as const, url: m.url, caption: m.caption };
    if (m.type === "VIRTUAL_TOUR" || m.type === "VIRTUAL_TOUR_360") return { id: m.id, kind: "tour" as const, url: m.url, caption: m.caption, label: "360° tour" };
    return { id: m.id, kind: "image" as const, url: m.url, caption: m.caption };
  });
  const tourMedia = property.media.find((m) => (m.type === "VIRTUAL_TOUR" || m.type === "VIRTUAL_TOUR_360") && parseTourMeta(m.meta));
  const tourSlot = tourMedia ? (() => {
    const parsed = parseTourMeta(tourMedia.meta)!;
    return <VirtualTour scenes={parsed.scenes} provider={parsed.provider} height={460} />;
  })() : undefined;

  return (
    <article className="container-page py-10">
      <nav className="mb-6 text-sm text-ink-500">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`/search?category=${property.category.slug}`} className="hover:text-brand-700">
          {property.category.name}
        </Link>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        {property.verificationBadge ? <Badge tone="success" dot>Verified</Badge> : null}
        <Badge tone="neutral">{property.category.name}</Badge>
        {property.instantBooking ? <Badge tone="info">Instant booking</Badge> : <Badge tone="warning">Approval required</Badge>}
      </div>

      <h1 className="mt-3 font-display text-3xl text-ink-900 sm:text-4xl">{property.name}</h1>
      <p className="mt-2 text-ink-600">{location}</p>
      <div className="mt-3">
        <Rating value={property.ratingAverage ?? 0} count={property.ratingCount ?? 0} />
      </div>

      {galleryItems.length > 0 || tourSlot ? (
        <div className="mt-8">
          <PropertyGallery
            items={galleryItems.filter((i) => i.kind !== "tour")}
            tourSlot={tourSlot}
            tourLabel="Virtual tour"
            propertyName={property.name}
          />
        </div>
      ) : images.length > 0 ? (
        <div className="mt-8 grid gap-2 sm:grid-cols-3">
          {images.slice(0, 3).map((media) => (
            <div key={media.id} className="h-56 rounded-lg bg-brand-100 bg-cover bg-center" style={{ backgroundImage: `url(${media.url})` }} />
          ))}
        </div>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-2xl text-ink-900">About this property</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-700">{property.description}</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink-900">Duration &amp; rules</h2>
            <dl className="mt-3 max-w-xl">
              <InfoRow label="Minimum stay" value={`${property.minNights} nights`} />
              <InfoRow
                label="Maximum stay"
                value={property.maxNights ? describeDuration(property.maxNights) : "No limit set by the owner"}
              />
              <InfoRow label="Check-in" value={`${property.checkInFrom ?? "14:00"} – ${property.checkInTo ?? "22:00"}`} />
              <InfoRow label="Check-out" value={property.checkOutUntil ?? "12:00"} />
              <InfoRow label="Sleeps up to" value={`${property.maxGuests} guests`} />
              <InfoRow label="Bedrooms / bathrooms" value={`${property.bedrooms} / ${property.bathrooms}`} />
            </dl>
          </section>

          {property.amenities.length > 0 ? (
            <section>
              <h2 className="font-display text-2xl text-ink-900">Amenities</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {property.amenities.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2 text-ink-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                    {entry.amenity.name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {units.length > 0 ? (
            <section>
              <h2 className="font-display text-2xl text-ink-900">Units &amp; pricing</h2>
              <div className="mt-4 space-y-3">
                {units.map((unit) => (
                  <div key={unit.id} className="rounded-lg border border-line bg-white p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-ink-900">{unit.label}</h3>
                      {unit.rate?.nightlyRate ? (
                        <PriceInline amount={unit.rate.nightlyRate} currency={property.currency} basis="NIGHTLY" compact />
                      ) : (
                        <span className="text-sm text-ink-500">Rates on request</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-ink-600">
                      Sleeps {unit.maxGuests} · {unit.bedrooms} bed · {unit.bathrooms} bath
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-600">
                      {unit.rate?.weeklyRate ? (
                        <span>Weekly <strong>{formatMoney(unit.rate.weeklyRate, property.currency, { compact: true })}</strong></span>
                      ) : null}
                      {unit.rate?.monthlyRate ? (
                        <span>Monthly <strong>{formatMoney(unit.rate.monthlyRate, property.currency, { compact: true })}</strong></span>
                      ) : null}
                      {unit.rate?.annualRate ? (
                        <span>Yearly <strong>{formatMoney(unit.rate.annualRate, property.currency, { compact: true })}</strong></span>
                      ) : null}
                    </div>
                    <PublicUnitMedia media={unit.media} unitLabel={unit.label} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="font-display text-2xl text-ink-900">Guest reviews</h2>
            {property.reviews.length === 0 ? (
              <EmptyState className="mt-4" title="No reviews yet" description="This property has not been reviewed yet." />
            ) : (
              <ul className="mt-4 space-y-4">
                {property.reviews.map((review) => (
                  <li key={review.id} className="rounded-lg border border-line bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-ink-900">{review.title ?? "Great stay"}</strong>
                      <Rating value={review.overallRating} size="sm" />
                    </div>
                    <p className="mt-2 text-ink-700">{review.body}</p>
                    <p className="mt-2 text-sm text-ink-500">{review.user.firstName}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {user ? (
            <div className="space-y-4">
              <BookingWidget
                propertyId={property.id}
                propertySlug={property.slug}
                propertyName={property.name}
                currency={property.currency}
                bookingMode={property.bookingMode}
                instantBooking={property.instantBooking}
                minNights={property.minNights}
                maxNights={property.maxNights}
                acceptedCheckInDays={property.acceptedCheckInDays}
                maxGuests={property.maxGuests}
                units={unitSummaries}
                allowPayLater={property.allowPayLater}
                unpaidHoldDays={property.unpaidHoldDays}
              />
              <p className="text-center text-[12px] text-ink-500">
                Booking as <span className="font-medium text-ink-700">{user.email}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-white p-5 shadow-md">
              <h2 className="font-display text-xl text-ink-900">Interested?</h2>
              <p className="mt-1 text-sm text-ink-500">
                {property.baseNightlyRate
                  ? `From ${formatMoney(property.baseNightlyRate, property.currency, { compact: true })} ${RATE_BASIS_LABELS[property.priceBasis]}`
                  : "Rates shown per unit"}
              </p>
              {property.cancellationPolicy ? (
                <p className="mt-4 text-sm text-ink-600">
                  <strong>Cancellation:</strong> {property.cancellationPolicy.name}
                  {property.cancellationPolicy.description ? ` — ${property.cancellationPolicy.description}` : ""}
                </p>
              ) : null}
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-sm font-medium text-ink-900">{property.partner.businessName}</p>
                <p className="text-sm text-ink-500">{property.partner.city}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ButtonLink href={`/search?category=${property.category.slug}`} variant="outline" size="sm">
                    Similar stays
                  </ButtonLink>
                  <ButtonLink href="/login" variant="secondary" size="sm">
                    Sign in to book
                  </ButtonLink>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
