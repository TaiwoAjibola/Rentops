import Link from "next/link";
import { BadgeCheck, CalendarCheck, CreditCard, FileCheck2, MessageSquareText, Search } from "lucide-react";
import type { Metadata } from "next";

import { Faq, NumberedSteps, Prose } from "@/app/(public)/_components/info";
import { ClosingCta, PageHero } from "@/app/(public)/_components/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { Callout } from "@/components/ui/data";
import { TrustBar } from "@/components/public/trust-bar";

export const metadata: Metadata = {
  title: "How RentOps works",
  description:
    "Search, book or lease accommodation in Nigeria through one process: verified listings, secure payment through a licensed provider, and clear terms set by each property.",
};

const GUEST_STEPS = [
  {
    title: "Search with real dates",
    body: "Enter a city or area and the dates you need. You only see listings that are approved and active, with the rate and the billing period — per night, per week, per month or per year — shown up front.",
  },
  {
    title: "Compare what actually matters",
    body: "Open the listings that suit you and check the things that differ: the unit you would get, the minimum stay the owner accepts, the cancellation terms, and whether the property books instantly or needs approval.",
  },
  {
    title: "Request or book",
    body: "Instant-booking properties confirm as soon as payment succeeds. Approval properties are held while the owner reviews your request — nothing is charged until they accept.",
  },
  {
    title: "Pay through the platform",
    body: "Payment is collected by a licensed Nigerian payment provider. RentOps never asks you to transfer money to a personal account, and card details are handled by the provider, not by the property.",
  },
  {
    title: "Move in, then check out",
    body: "You receive the reference, the address and the host contact details. Arrival and departure are recorded against your reservation, which is what starts the settlement clock for the owner.",
  },
  {
    title: "Leave a review",
    body: "After your stay you can rate cleanliness, accuracy, communication, location and value. Published reviews help the next person decide — and keep standards honest.",
  },
];

const PARTNER_STEPS = [
  {
    title: "Register your business",
    body: "Create a partner account and tell us what you operate — a hotel, a shortlet, a serviced apartment building, a family home, a managed portfolio or a development.",
  },
  {
    title: "Verify once",
    body: "Submit proof of identity, of your business where relevant, and of your authority to list the property. Verification is done once and carries across everything you list.",
  },
  {
    title: "Add properties and units",
    body: "List whole properties, individual units or room categories — each with its own rates for the periods you actually sell: nightly, weekly, monthly or annual.",
  },
  {
    title: "Set your own rules",
    body: "You control minimum and maximum stay, notice periods, check-in days, cancellation terms and whether guests book instantly or wait for your approval.",
  },
  {
    title: "Take bookings",
    body: "Availability updates as reservations are made, so you cannot be double-booked. Requests arrive in your dashboard with the guest details you need to decide.",
  },
  {
    title: "Get paid",
    body: "RentOps earns a commission on accommodation revenue only. For platform-collected stays, your payout is released after verified check-in plus the settlement hold set in the settlement policy.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Is a short stay and a long lease really the same process?",
    answer: (
      <p>
        Yes. Both are a reservation with a start date and an end date. What changes is the length, the
        rate that applies and — on longer stays — any extra verification the property has asked for.
        There is no separate leasing system to learn, and your history stays in one account.
      </p>
    ),
  },
  {
    question: "Why does one listing book instantly and another need approval?",
    answer: (
      <p>
        Each partner chooses their booking mode. Operators with 24-hour front desks often allow instant
        booking because they can honour anything that comes in. Owners who want to screen guests set
        their properties to approval, and nothing is charged until they accept. Both are labelled on the
        listing before you pay.
      </p>
    ),
  },
  {
    question: "Can I see a property before committing to a long lease?",
    answer: (
      <p>
        Many listings support inspection requests. You arrange a visit through the platform, the owner
        confirms a time, and everything is recorded against the property so there is a clear trail. If a
        listing does not offer inspections, message the owner and ask.
      </p>
    ),
  },
  {
    question: "What happens to my money if something goes wrong?",
    answer: (
      <p>
        Every listing states its own cancellation terms before you pay, and refunds follow that policy.
        If the accommodation is not as described, you can raise a dispute from your reservation and a
        RentOps support agent reviews the evidence from both sides. See{" "}
        <Link href="/trust-and-safety">Trust &amp; safety</Link> for how that works.
      </p>
    ),
  },
  {
    question: "Does RentOps hold my rent?",
    answer: (
      <p>
        Payment is collected by a licensed Nigerian payment provider. RentOps does not hold customer
        funds in its own bank account as escrow; it is a marketplace that records what was charged, what
        the partner is owed and what was paid out. Long-let arrangements may use a different collection
        model depending on what the partner agreed.
      </p>
    ),
  },
];

export default function HowItWorksPage() {
  return (
    <div>
      <PageHero
        eyebrow="How it works"
        title="One process, whether you are staying two nights or two years"
        description="RentOps runs short stays and long leases through the same pipeline — search, agree dates, pay securely, move in. Here is exactly what happens at each stage, for guests and for the people who own the accommodation."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/search" variant="inverse" size="sm">
            Find accommodation
          </ButtonLink>
          <ButtonLink
            href="/partners"
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15"
          >
            List your property
          </ButtonLink>
        </div>
      </PageHero>

      <section className="container-page mt-14">
        <TrustBar />
      </section>

      <section className="container-page mt-16">
        <SectionHeading
          eyebrow="For guests"
          title="Booking a place to stay"
          description="No membership fee, no subscription. You create an account so your reservations, messages and inspection requests live in one place."
        />
        <NumberedSteps steps={GUEST_STEPS} className="mt-8" />
      </section>

      <section className="container-page mt-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Duration"
              title="Short stay or long lease — the difference is data, not a different system"
              description="A two-night stay and an annual tenancy are both a check-in date and a check-out date. Because duration is just data, the same listing can sell a night, a month or a year, each with its own rate."
            />
            <Prose className="mt-5">
              <p>
                Partners only configure the periods they actually sell. A hotel may publish nightly and
                weekly rates; a landlord letting a three-bedroom flat may publish monthly and annual
                rates only. Whichever applies, the price you see on RentOps always carries its billing
                period, so you are never comparing a nightly figure against a yearly one by mistake.
              </p>
              <p>
                Each property also decides how long it is willing to host you. Minimum and maximum stay,
                notice periods and accepted check-in days belong to the owner, not to us — you see them
                before you book, and a request that breaks those rules simply cannot be made.
              </p>
              <p>
                Longer stays can carry extra verification, such as identity or background checks, where
                the property has asked for it. That is explained on the listing and again during booking,
                so you know what committing to a year involves before you pay anything.
              </p>
            </Prose>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Search,
                title: "Search",
                body: "Filter by city, dates, guests, budget, amenities and whether you need instant confirmation.",
              },
              {
                icon: CalendarCheck,
                title: "Agree the dates",
                body: "Availability is checked per unit, so a reserved room is never offered twice.",
              },
              {
                icon: CreditCard,
                title: "Pay securely",
                body: "Card payment is handled by a licensed Nigerian payment provider — never a private transfer.",
              },
              {
                icon: FileCheck2,
                title: "Verified where it counts",
                body: "Identity, business, ownership and location checks back the listings that carry a verification badge.",
              },
              {
                icon: MessageSquareText,
                title: "Stay in contact",
                body: "Questions, inspection requests and post-stay issues all live in your account threads.",
              },
              {
                icon: BadgeCheck,
                title: "Review afterwards",
                body: "Published reviews keep both sides accountable and make the next decision easier.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="flex gap-4 p-5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink-900">{item.title}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-ink-600">{item.body}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page mt-20">
        <SectionHeading
          eyebrow="For owners & operators"
          title="Going live on RentOps"
          description="From registration to your first payout, here is the actual sequence — no sales call required to start."
        />
        <NumberedSteps steps={PARTNER_STEPS} className="mt-8" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Callout tone="info" title="What RentOps earns">
            A commission on accommodation revenue only. The gross amount a customer pays is the customer
            paying for accommodation, not RentOps income — see{" "}
            <Link href="/partners/pricing" className="font-semibold underline underline-offset-2">
              commissions &amp; settlement
            </Link>{" "}
            for how payouts are calculated and released.
          </Callout>
          <Callout tone="success" title="What you keep">
            Control of your pricing, your availability calendar, your house rules, your minimum stays and
            your cancellation terms. RentOps brings demand and the payment and booking infrastructure.
          </Callout>
        </div>
      </section>

      <section className="container-page mt-20">
        <SectionHeading
          eyebrow="Questions"
          title="The things people ask most"
          description="If your question is not here, message us and a real person will answer."
        />
        <Faq items={FAQ_ITEMS} className="mt-8" />
      </section>

      <ClosingCta
        title="Ready when you are"
        description="Search your city, compare real listings, and book with payment handled by a licensed provider. Or put your own property in front of people looking for exactly what you have."
        primary={<ButtonLink href="/search">Find accommodation</ButtonLink>}
        secondary={
          <ButtonLink
            href="/partner/register"
            variant="outline"
            className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/15"
          >
            Become a partner
          </ButtonLink>
        }
      />
    </div>
  );
}
