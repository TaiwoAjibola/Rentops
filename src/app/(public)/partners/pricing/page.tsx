import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

import { Faq, Prose } from "@/app/(public)/_components/info";
import { ClosingCta, PageHero } from "@/app/(public)/_components/page-hero";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { Callout, DataTable, TableCell, TableRow } from "@/components/ui/data";
import { PriceTag } from "@/components/ui/price";
import { LEDGER_TYPE_LABELS } from "@/lib/constants";
import { parseDateInput } from "@/lib/dates";
import { formatMoney, majorToMinor } from "@/lib/money";
import { buildQuote, computeUnitStay, type UnitRateInput } from "@/lib/pricing";
import { getFinancialConfig } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Commissions, fees & settlement",
  description:
    "How RentOps gets paid: a platform commission on accommodation revenue only, how processing fees are handled, and when partner payouts are released after verified check-in.",
};

/**
 * Worked example — priced by the real pricing engine rather than typed out by
 * hand, so the figures on this page can never drift from what a booking costs.
 */
const EXAMPLE_NIGHTLY = majorToMinor(50_000);
const EXAMPLE_CLEANING = majorToMinor(15_000);
// Fixed example dates for the worked commission example (UTC calendar dates,
// matching how booking dates are stored).
const EXAMPLE_CHECK_IN = new Date(Date.UTC(2026, 11, 1));
const EXAMPLE_CHECK_OUT = new Date(Date.UTC(2026, 11, 4));

function exampleQuote(config: {
  commissionRate: number;
  processingFeeRate: number;
  processingFeeFlat: number;
  processingFeeBearer: "PLATFORM" | "PARTNER";
}) {
  const rate: UnitRateInput = {
    unitId: "example-unit",
    label: "Example unit",
    maxGuests: 2,
    nightlyRate: EXAMPLE_NIGHTLY,
    weeklyRate: null,
    monthlyRate: null,
    annualRate: null,
    weekendNightlyRate: null,
    extraGuestFee: 0,
    extraGuestThreshold: null,
    cleaningFee: EXAMPLE_CLEANING,
    serviceCharge: 0,
    securityDeposit: 0,
  };

  const stay = computeUnitStay({ rate, checkIn: EXAMPLE_CHECK_IN, checkOut: EXAMPLE_CHECK_OUT });

  return buildQuote({
    checkIn: EXAMPLE_CHECK_IN,
    checkOut: EXAMPLE_CHECK_OUT,
    guests: 2,
    stays: [stay],
    commissionRate: config.commissionRate,
    processingFeeRate: config.processingFeeRate,
    processingFeeFlat: config.processingFeeFlat,
    processingFeeBearer: config.processingFeeBearer,
  });
}

export default async function PartnerPricingPage() {
  const config = await getFinancialConfig();
  const quote = exampleQuote(config);
  const currency = config.currency;
  const partnerBearsProcessing = config.processingFeeBearer === "PARTNER";

  return (
    <div>
      <PageHero
        eyebrow="Partners · Pricing"
        title="RentOps earns when you earn"
        description="There is no charge to register and no charge to hold a listing. RentOps takes a commission on accommodation revenue — nothing else — and your payout is released on a documented settlement schedule."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/partner/register" variant="inverse" size="sm">
            Create a partner account
          </ButtonLink>
          <ButtonLink
            href="/partners"
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15"
          >
            Why list on RentOps
          </ButtonLink>
        </div>
      </PageHero>

      {/* Headline commercial model ---------------------------------------- */}
      <section className="container-page mt-14">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-6">
            <p className="text-[12px] font-medium uppercase tracking-[0.07em] text-ink-500">
              Platform commission
            </p>
            <p className="mt-3 font-display text-4xl text-ink-900">{config.commissionRate}%</p>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-600">
              Charged on <strong className="font-semibold text-ink-900">accommodation revenue only</strong>{" "}
              — the current RentOps default. Individual partners may agree a different rate, which is
              always shown in the partner dashboard.
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-[12px] font-medium uppercase tracking-[0.07em] text-ink-500">
              Processing
            </p>
            <p className="mt-3 font-display text-4xl text-ink-900">{config.processingFeeRate}%</p>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-600">
              Charged by the payment provider on the customer total
              {config.processingFeeFlat > 0
                ? `, plus ${formatMoney(config.processingFeeFlat, currency)} per transaction`
                : ""}
              . Currently borne by{" "}
              <strong className="font-semibold text-ink-900">
                {partnerBearsProcessing ? "the partner" : "RentOps"}
              </strong>
              .
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-[12px] font-medium uppercase tracking-[0.07em] text-ink-500">
              Settlement hold
            </p>
            <p className="mt-3 font-display text-4xl text-ink-900">
              {config.settlementHoldDays}{" "}
              <span className="font-sans text-lg font-medium text-ink-500">
                {config.settlementHoldDays === 1 ? "day" : "days"}
              </span>
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-600">
              Applied after a verified check-in before a platform-collected payout is released. Partners
              may have their own agreed hold.
            </p>
          </Card>
        </div>

        <Callout tone="warning" title="What counts as RentOps revenue" className="mt-6">
          The gross amount a customer pays is{" "}
          <strong className="font-semibold">not</strong> RentOps revenue. It is the customer paying for
          accommodation, including the amounts that belong to you. RentOps revenue is the commission —
          nothing more.
        </Callout>
      </section>

      {/* Worked example ---------------------------------------------------- */}
      <section className="container-page mt-20">
        <SectionHeading
          eyebrow="Worked example"
          title="What one booking looks like on both sides"
          description="A three-night stay at ₦50,000 per night with a one-off cleaning fee of ₦15,000. The figures below are produced by the RentOps pricing engine using the rates configured right now."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <Card className="p-6">
            <h3 className="text-[15px] font-semibold text-ink-900">Example listing</h3>
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-[12.5px] uppercase tracking-[0.07em] text-ink-500">Advertised rate</dt>
                <dd className="mt-1.5">
                  <PriceTag amount={EXAMPLE_NIGHTLY} currency={currency} basis="NIGHTLY" />
                </dd>
              </div>
              <div>
                <dt className="text-[12.5px] uppercase tracking-[0.07em] text-ink-500">Cleaning fee</dt>
                <dd className="mt-1.5 text-[15px] font-semibold text-ink-900">
                  {formatMoney(EXAMPLE_CLEANING, currency)}{" "}
                  <span className="text-[12px] font-medium text-ink-500">charged once per stay</span>
                </dd>
              </div>
              <div>
                <dt className="text-[12.5px] uppercase tracking-[0.07em] text-ink-500">Length of stay</dt>
                <dd className="mt-1.5 text-[15px] font-semibold text-ink-900">
                  3 nights{" "}
                  <span className="text-[12px] font-medium text-ink-500">
                    (1 – 4 December, illustrative)
                  </span>
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="overflow-hidden">
            <DataTable headers={["Line", "Amount"]}>
              <TableRow>
                <TableCell>
                  Accommodation — 3 nights at {formatMoney(EXAMPLE_NIGHTLY, currency)} per night
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatMoney(quote.accommodationSubtotal, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cleaning fee — charged once per reservation</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatMoney(quote.cleaningFee, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <span className="font-semibold text-ink-900">
                    Customer total for the 3-night stay
                  </span>{" "}
                  <span className="text-[13px] text-ink-500">
                    (this is not RentOps revenue)
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums text-ink-900">
                  {formatMoney(quote.grossAmount, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  RentOps commission — {config.commissionRate}% of accommodation only
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums text-danger">
                  −{formatMoney(quote.platformCommission, currency)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  Processing fee — {config.processingFeeRate}% of the customer total
                  {partnerBearsProcessing ? " (borne by the partner)" : " (borne by RentOps)"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {partnerBearsProcessing ? `−${formatMoney(quote.processingFee, currency)}` : "Not deducted from you"}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <span className="font-semibold text-ink-900">Released to you</span>{" "}
                  <span className="text-[13px] text-ink-500">
                    after verified check-in plus the settlement hold
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums text-success">
                  {formatMoney(quote.partnerNetAmount, currency)}
                </TableCell>
              </TableRow>
            </DataTable>
          </Card>
        </div>

        <Prose className="mt-6 max-w-3xl">
          <p>
            Commission is calculated on the accommodation subtotal, so cleaning fees, service charges
            and extra-guest charges you have set are passed through to you in your payout rather than
            being skimmed again. The example above is illustrative; your own rates, commission and
            processing arrangements are shown before you confirm anything in the partner dashboard.
          </p>
        </Prose>
      </section>

      {/* Settlement & payouts --------------------------------------------- */}
      <section className="container-page mt-20">
        <SectionHeading
          eyebrow="Settlement"
          title="How and when money reaches you"
          description="Short stays, weekly lets and annual leases do not all collect money the same way. Here is what each model means for your cash flow."
        />

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <Card className="p-6">
            <Badge tone="info">Short stays</Badge>
            <h3 className="mt-4 text-[16px] font-semibold text-ink-900">Platform-collected</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
              The customer pays through the platform at booking. Your payout is scheduled after the
              check-in recorded against the reservation, plus the settlement hold set in the settlement
              policy — currently{" "}
              <strong className="font-semibold text-ink-900">
                {config.settlementHoldDays} {config.settlementHoldDays === 1 ? "day" : "days"}
              </strong>
              . The hold protects guests long enough for genuine problems on arrival to surface.
            </p>
          </Card>

          <Card className="p-6">
            <Badge tone="neutral">Long lets</Badge>
            <h3 className="mt-4 text-[16px] font-semibold text-ink-900">Different collection models</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
              Long-let arrangements may use a different collection model agreed with you — collected by
              the platform, collected directly by you, or a mix of both across a portfolio. Whichever
              applies, the reservation still records exactly what is owed, so nothing depends on memory
              or a spreadsheet.
            </p>
          </Card>

          <Card className="p-6">
            <Badge tone="success">Always visible</Badge>
            <h3 className="mt-4 text-[16px] font-semibold text-ink-900">Line-by-line records</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
              Every amount in a booking is written to the ledger:{" "}
              {LEDGER_TYPE_LABELS.CUSTOMER_PAYMENT}, {LEDGER_TYPE_LABELS.PARTNER_PAYABLE},{" "}
              {LEDGER_TYPE_LABELS.PLATFORM_COMMISSION}, {LEDGER_TYPE_LABELS.PROCESSING_FEE} and{" "}
              {LEDGER_TYPE_LABELS.PARTNER_PAYOUT}. You can reconcile a payout to the stays inside it
              without asking anyone.
            </p>
          </Card>
        </div>
      </section>

      {/* Money handling ---------------------------------------------------- */}
      <section className="container-page mt-20">
        <div className="rounded-lg border border-line bg-brand-50/60 p-8 sm:p-10">
          <SectionHeading
            eyebrow="Money handling"
            title="Who touches the customer's money"
            description="This is the part most marketplaces are vague about, so here it is plainly."
          />

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Collected by a licensed provider",
                body: "Customer payments are collected by a licensed Nigerian payment provider. Card details are handled by that provider, never by RentOps and never by the property.",
              },
              {
                title: "RentOps is not an escrow account",
                body: "RentOps does not hold customer funds in its own bank account as escrow. Amounts owed to you are tracked as partner payables until they are paid out.",
              },
              {
                title: "No personal-account payments",
                body: "Guests are never asked to transfer money to an individual. A payment that does not go through the platform is not a RentOps booking and is not covered by our dispute process.",
              },
              {
                title: "Commission is only earned on revenue",
                body: "If a booking is cancelled and refunded, there is no accommodation revenue and no commission on it. RentOps does not profit from stays that never happened.",
              },
            ].map((item) => (
              <li key={item.title} className="rounded-lg border border-line bg-white p-5 shadow-xs">
                <h3 className="text-[14.5px] font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600">{item.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <ButtonLink href="/trust-and-safety" variant="outline">
              Read trust &amp; safety
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* FAQ --------------------------------------------------------------- */}
      <section className="container-page mt-20">
        <SectionHeading
          eyebrow="Questions"
          title="Commercial detail, without the small print"
          description="Anything still unclear? Ask the partnerships team before you list."
        />
        <Faq
          className="mt-8"
          items={[
            {
              question: "Can my commission rate be different from the default?",
              answer: (
                <p>
                  Yes. Partners may have their own agreed rate, which overrides the platform default.
                  Your effective rate is stored on your partner record and shown on every quote and
                  settlement, so you always know what will be deducted.
                </p>
              ),
            },
            {
              question: "Is commission charged on cleaning fees and service charges?",
              answer: (
                <p>
                  No. Commission applies to the accommodation subtotal. Cleaning fees, service charges
                  and extra-guest charges you configure are included in the customer total and passed
                  through to you in the payout.
                </p>
              ),
            },
            {
              question: "What happens to my money if a guest cancels?",
              answer: (
                <p>
                  Refunds follow the cancellation policy attached to the listing — the one you set. Where
                  the guest is entitled to a refund, the accommodation revenue disappears and so does the
                  commission on it. Any commission already earned is reversed in the settlement.
                </p>
              ),
            },
            {
              question: "Are there separate fees for photography, setup or support?",
              answer: (
                <p>
                  RentOps does not charge a joining fee, a listing fee or a subscription to keep your
                  property visible. The commercial model is commission on accommodation revenue; talk to{" "}
                  <Link href="/contact" className="font-semibold underline underline-offset-2">
                    the partnerships team
                  </Link>{" "}
                  if you want something structured differently for a large portfolio.
                </p>
              ),
            },
            {
              question: "How do payouts actually reach my bank?",
              answer: (
                <p>
                  Payouts are made to the bank account you nominate on your partner profile. The account
                  name, bank and currency on each settlement are recorded against the settlement itself,
                  so there is a clear audit trail for every naira that leaves the platform.
                </p>
              ),
            },
          ]}
        />
      </section>

      <ClosingCta
        title="Know exactly what you will earn, before you list"
        description="Create a partner account, set your rates, and see the commission and payout on every quote — before a single guest books."
        primary={<ButtonLink href="/partner/register">Create a partner account</ButtonLink>}
        secondary={
          <ButtonLink
            href="/contact"
            variant="outline"
            className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15"
          >
            Ask about a portfolio rate
          </ButtonLink>
        }
      />
    </div>
  );
}
