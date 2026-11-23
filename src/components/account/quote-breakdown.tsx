import { PriceBreakdown } from "@/components/ui/price";
import { describeDuration } from "@/lib/dates";
import { safeJsonParse } from "@/lib/utils";
import type { Quote } from "@/lib/pricing";

export type ReservationMoney = {
  quote: unknown;
  currency: string;
  nights: number;
  guests: number;
  priceBasis: string;
  accommodationSubtotal: number;
  extraGuestCharges: number;
  cleaningFee: number;
  serviceCharge: number;
  discountAmount: number;
  grossAmount: number;
  refundAmount?: number;
};

function quoteFrom(value: unknown): Quote | null {
  if (!value || typeof value !== "object") return null;
  const parsed = safeJsonParse<Partial<Quote>>(value, {} as Partial<Quote>);
  if (!parsed || typeof parsed.accommodationSubtotal !== "number") return null;
  return parsed as Quote;
}

/**
 * Renders the price breakdown the guest was shown at booking time. The
 * immutable `quote` snapshot wins; the reservation columns are the fallback for
 * rows created before the snapshot existed.
 */
export function ReservationPriceBreakdown({ reservation }: { reservation: ReservationMoney }) {
  const quote = quoteFrom(reservation.quote);
  const currency = quote?.currency ?? reservation.currency;

  const rows: { label: string; amount: number; muted?: boolean }[] = [
    {
      label: `Accommodation · ${quote && quote.lines.length > 0 ? quote.lines.map((line) => line.unitLabel).join(", ") : describeDuration(reservation.nights)}`,
      amount: quote?.accommodationSubtotal ?? reservation.accommodationSubtotal,
    },
  ];

  const extraGuests = quote?.extraGuestCharges ?? reservation.extraGuestCharges;
  if (extraGuests > 0) rows.push({ label: "Extra guest charges", amount: extraGuests });

  const cleaning = quote?.cleaningFee ?? reservation.cleaningFee;
  if (cleaning > 0) rows.push({ label: "Cleaning fee", amount: cleaning });

  const service = quote?.serviceCharge ?? reservation.serviceCharge;
  if (service > 0) rows.push({ label: "Service charge", amount: service });

  const discount = quote?.discountAmount ?? reservation.discountAmount;
  if (discount > 0) rows.push({ label: "Discount", amount: -discount, muted: true });

  if (reservation.refundAmount && reservation.refundAmount > 0) {
    rows.push({ label: "Refund due", amount: -reservation.refundAmount, muted: true });
  }

  return <PriceBreakdown rows={rows} total={{ label: "Total paid", amount: reservation.grossAmount }} currency={currency} />;
}
