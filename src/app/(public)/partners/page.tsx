import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Hotel,
  KeyRound,
  LayoutGrid,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Star,
  Users2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";

import { Faq, NumberedSteps } from "@/app/(public)/_components/info";
import { ClosingCta, PageHero } from "@/app/(public)/_components/page-hero";
import { TrustBar } from "@/components/public/trust-bar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { Callout, Stat } from "@/components/ui/data";
import { PARTNER_TYPE_LABELS } from "@/lib/constants";
import type { PartnerType } from "@prisma/client";
import { getFinancialConfig } from "@/lib/settings";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "List your property on RentOps",
  description:
    "Hotels, shortlet owners, serviced apartment operators, landlords, property managers and developers: take verified bookings online and get paid — you keep control of your pricing, availability and house rules.",
};

const AUDIENCES: { type: PartnerType; icon: LucideIcon; body: string }[] = [
  {
    type: "HOTEL",
    icon: Hotel,
    body: "Publish room categories and individual rooms, keep the rhythm your front desk already works to, and take card bookings that reconcile themselves.",
  },
  {
    type: "SERVICED_APARTMENT_OPERATOR",
    icon: Building2,
    body: "Sell the same apartment by the night, the week or the month from a single inventory, so corporate lets and short stays share one calendar.",
  },
  {
    type: "SHORTLET_OWNER",
    icon: KeyRound,
    body: "Set your own minimum stays, weekend rates and cleaning fees, and let availability update itself every time a booking lands.",
  },
  {
    type: "INDIVIDUAL_OWNER",
    icon: LayoutGrid,
    body: "List one flat or a family home, decide whether guests book instantly or wait for your approval, and manage long tenants in the same account.",
  },
  {
    type: "PROPERTY_MANAGEMENT_COMPANY",
    icon: Users2,
    body: "Run a whole portfolio under one partner account, with per-staff roles and permissions so your team only touches what they should.",
  },
  {
    type: "PROPERTY_DEVELOPER",
    icon: Sparkles,
    body: "Release inventory across a new development unit by unit, with different rates for each phase as you bring it online.",
  },
];

const CAPABILITIES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: LayoutGrid,
    title: "Inventory you actually control",
    body: "Model whole properties, room categories and individual units. Each unit carries its own capacity, beds, floor and photographs.",
  },
  {
    icon: CircleDollarSign,
    title: "Rates for the periods you sell",
    body: "Configure nightly, weekly, monthly and annual rates per unit, plus weekend and seasonal rates when your calendar justifies them.",
  },
  {
    icon: CalendarClock,
    title: "Availability that cannot double-book",
    body: "Reservations and manual blocks hold real inventory, so a unit already taken for a date is not offered again for that date.",
  },
  {
    icon: ShieldCheck,
    title: "Booking modes on your terms",
    body: "Choose instant booking or approval per property, with your own minimum and maximum stay, notice period and accepted check-in days.",
  },
  {
    icon: Banknote,
    title: "Transparent money movements",
    body: "Every reservation produces a quote breakdown: accommodation, cleaning, service charges, commission, processing and what is owed to you.",
  },
  {
    icon: MessageSquareText,
    title: "Guests you can actually talk to",
    body: "Answer questions, handle inspection requests and keep every conversation in a thread tied to the reservation.",
  },
  {
    icon: Star,
    title: "Reviews that build your reputation",
    body: "Ratings on cleanliness, accuracy, communication, location and value, published only after a completed stay.",
  },
  {
    icon: ShieldCheck,
    title: "Verification that means something",
    body: "Identity, business, ownership and location checks give guests a reason to choose your listing over an unverified one.",
  },
];

const ONBOARDING = [
  {
    title: "Create the account",
    body: "Tell us what you operate and where. Nothing is charged to register, and you can invite your team straight away.",
  },
  {
    title: "Verify once",
    body: "Upload proof of identity, your business documents where relevant, and evidence that you may list the property. We review before publishing.",
  },
  {
    title: "Build the listing",
    body: "Add the property, its units, photographs and amenities, then set rates for the periods you sell and your cancellation terms.",
  },
  {
    title: "Go live",
    body: "Submit for review. Once approved, your listing is discoverable in search, categories and destinations immediately.",
  },
  {
    title: "Get paid",
    body: "Take bookings, check guests in, and receive payouts on the settlement schedule for your account.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Do I lose control of my pricing?",
    answer: (
      <p>
        No. You configure every rate and every rule: minimum and maximum stay, notice period, accepted
        check-in days, cleaning and service charges, seasonal pricing and cancellation terms. RentOps
        presents what you set — it does not override it.
      </p>
    ),
  },
  {
    question: "What does RentOps charge?",
    answer: (
      <p>
        A commission on accommodation revenue only. The gross amount a guest pays is not RentOps
        revenue. The current default rate, how processing is handled and when payouts are released are
        all set out on the{" "}
        <Link href="/partners/pricing" className="font-semibold underline underline-offset-2">
          commissions &amp; settlement
        </Link>{" "}
        page.
      </p>
    ),
  },
  {
    question: "Can I keep taking my own direct bookings?",
    answer: (
      <p>
        Yes. RentOps is a channel, not an exclusivity agreement. You can block dates in your calendar
        for guests who came to you directly, so nothing you sell offline is ever sold twice.
      </p>
    ),
  },
  {
    question: "Who handles the money?",
    answer: (
      <p>
        Payments are collected by a licensed Nigerian payment provider — RentOps does not hold customer
        funds in its own bank account as escrow. For platform-collected stays, your payout is released
        after verified check-in plus the settlement hold in the settlement policy. Long-let arrangements
        may use a different collection model.
      </p>
    ),
  },
  {
    question: "Is there a cost to register or to keep a listing published?",
    answer: (
      <p>
        Registering a partner account costs nothing. RentOps earns only when a booking completes, so the
        commercial relationship starts with revenue rather than a subscription. See{" "}
        <Link href="/partners/pricing" className="font-semibold underline underline-offset-2">
          pricing
        </Link>{" "}
        for the full model.
      </p>
    ),
  },
];

export default async function PartnersPage() {
  const [config, listings, cities, verifiedPartners] = await Promise.all([
    getFinancialConfig(),
    prisma.property.count({ where: { status: "APPROVED", isActive: true } }),
    prisma.property.findMany({
      where: { status: "APPROVED", isActive: true },
      select: { city: true },
      distinct: ["city"],
    }),
    prisma.partner.count({ where: { verificationStatus: "VERIFIED", status: "ACTIVE" } }),
  ]);

  return (
    <div>
      <PageHero
        eyebrow="For property partners"
        title="Fill your rooms without handing over your business"
        description="RentOps gives hotels, shortlet owners, serviced apartment operators, landlords, property managers and developers the demand, booking and payment infrastructure to sell online — while you keep ownership of your pricing, availability and house rules."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/partner/register" variant="inverse" size="sm">
            Create a partner account
          </ButtonLink>
          <ButtonLink
            href="/partners/pricing"
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15"
          >
            Commissions &amp; settlement
          </ButtonLink>
        </div>
      </PageHero>

      <section className="container-page mt-14">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Live listings"
            value={listings.toLocaleString("en-US")}
            hint="Approved and active right now"
            icon={<LayoutGrid className="h-4 w-4" aria-hidden />}
          />
          <Stat
            label="Cities covered"
            value={String(cities.length)}
            hint="Places guests can search today"
            icon={<Building2 className="h-4 w-4" aria-hidden />}
          />
          <Stat
            label="Verified partners"
            value={verifiedPartners.toLocaleString("en-US")}
            hint="Identity and business checks complete"
            icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
            tone="success"
          />
        </div>
      </section>

      <section className="container-page mt-20">
        <SectionHeading
          eyebrow="Who it is for"
          title="Built for every way accommodation is owned in Nigeria"
          description="One platform for a single spare apartment, a thirty-key hotel, a managed portfolio of fifty units and a development still being finished."
        />

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((audience) => {
            const Icon = audience.icon;
            return (
              <li key={audience.type} className="h-full">
                <Card className="flex h-full flex-col p-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[16px] font-semibold text-ink-900">
                    {PARTNER_TYPE_LABELS[audience.type]}
                  </h3>
                  <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-600">{audience.body}</p>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="container-page mt-20">
        <SectionHeading
          eyebrow="What you get"
          title="The unglamorous parts, handled properly"
          description="Inventory, pricing, availability, money and communication are the things that break first when accommodation goes online. They are the parts RentOps does for you."
        />

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((capability) => {
            const Icon = capability.icon;
            return (
              <li key={capability.title}>
                <Card className="h-full p-5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-ink-50 text-ink-700">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[14.5px] font-semibold text-ink-900">{capability.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{capability.body}</p>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="container-page mt-20">
        <SectionHeading
          eyebrow="Onboarding"
          title="From registration to your first payout"
          description="Most of the work is describing what you already own. Verification happens once and carries across everything you list afterwards."
        />
        <NumberedSteps steps={ONBOARDING} className="mt-8" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Callout tone="info" title={`Commission: ${config.commissionRate}%`}>
            The current platform default is charged on accommodation revenue only — not on the gross
            amount the guest pays, and not on cleaning or service charges. Your agreed rate is shown in
            your partner dashboard.
          </Callout>
          <Callout tone="success" title="No cost to start">
            There is no charge to register or to build your listing. RentOps earns when a booking
            completes, so you are never paying for an empty calendar.
          </Callout>
        </div>
      </section>

      <section className="container-page mt-20">
        <div className="rounded-lg border border-line bg-white p-8 shadow-xs sm:p-10">
          <SectionHeading
            eyebrow="Trust"
            title="Why guests choose a RentOps listing"
            description="Verification, secure payment and a documented dispute process are what turn a browsing guest into a paying one."
          />
          <TrustBar className="mt-8" />
        </div>
      </section>

      <section className="container-page mt-20">
        <SectionHeading
          eyebrow="Questions"
          title="What partners ask before they list"
          description="If something here is unclear, message us — you will get a straight answer, not a brochure."
        />
        <Faq items={FAQ_ITEMS} className="mt-8" />
      </section>

      <ClosingCta
        title="Put your property in front of people already looking"
        description="Create a partner account, verify once, and publish your first listing. You keep every commercial decision about your property."
        primary={
          <ButtonLink href="/partner/register">
            Create a partner account
            <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        }
        secondary={
          <ButtonLink
            href="/contact"
            variant="outline"
            className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15"
          >
            Talk to the partnerships team
          </ButtonLink>
        }
      >
        <Badge tone="neutral" className="mt-6 border-white/20 bg-white/10 text-white">
          Already a partner? Sign in at your dashboard.
        </Badge>
      </ClosingCta>
    </div>
  );
}
