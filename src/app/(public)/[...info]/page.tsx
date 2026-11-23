import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

/**
 * Static informational pages.
 *
 * Because RentOps' concrete routes (/search, /categories, /partners, …) are
 * static segments they always win over this catch-all, so this only ever serves
 * the remaining flat pages linked from the footer.
 */

type InfoPage = {
  title: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
};

const PAGES: Record<string, InfoPage> = {
  about: {
    title: "About RentOps",
    intro:
      "RentOps is an accommodation marketplace built for Nigeria. We connect hotels, shortlet owners, serviced apartment operators, landlords and property developers with people who need somewhere to stay — for a single night or for several years.",
    sections: [
      {
        heading: "Why we exist",
        body: [
          "Finding accommodation in Nigeria is fragmented. Short stays, serviced living and long lets are handled by different people, with different processes and very little transparency on price or availability.",
          "RentOps brings those into one place, with the same search, booking and payment experience whether you need a hotel room for tonight or a three-bedroom flat for a year.",
        ],
      },
      {
        heading: "What we do",
        body: [
          "We provide the technology, marketplace visibility and transaction infrastructure. Property partners keep control of their pricing, availability, duration rules and guests.",
          "We verify partners and listings, collect payment through a licensed payment provider, and record every financial movement on an immutable ledger so partners and RentOps can reconcile accurately.",
        ],
      },
    ],
  },
  help: {
    title: "Help centre",
    intro: "Answers to the questions we are asked most often.",
    sections: [
      {
        heading: "Booking",
        body: [
          "Search by location, dates and the number of guests, then open a listing to see its units and prices. Select your dates on the listing page to see how the total is calculated.",
          "Some properties accept instant bookings; others require the partner to approve your request first. The listing always states which applies.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "Payments are collected by a licensed Nigerian payment provider. RentOps does not hold customer funds in its own bank account as escrow.",
          "For platform-collected short stays, the partner's payout is released after verified check-in, subject to the settlement policy.",
        ],
      },
      {
        heading: "Longer stays",
        body: [
          "Long leases may require additional identity and background verification, inspection requests, references and tenancy documentation. You will always be told before you pay or submit an application.",
        ],
      },
    ],
  },
  "trust-and-safety": {
    title: "Trust & safety",
    intro: "How RentOps protects guests and property partners.",
    sections: [
      {
        heading: "Verification",
        body: [
          "Partners are verified against business records, identity documents and listing authority. Listings are reviewed before they become publicly searchable, and properties that pass additional checks carry a verified badge.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "Customer payments are handled by a licensed payment provider with webhook-verified transaction records. RentOps records commission separately from partner money on a ledger that is independent of booking status.",
        ],
      },
      {
        heading: "Disputes",
        body: [
          "If something goes wrong, open a dispute from your reservation. RentOps operations review the case, the booking record and the payment history before resolving it.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact us",
    intro: "We are here to help guests and property partners.",
    sections: [
      {
        heading: "Get in touch",
        body: [
          `Email: ${SITE.supportEmail}`,
          `Partnerships: ${SITE.partnerEmail}`,
          `Phone: ${SITE.phone}`,
        ],
      },
    ],
  },
  terms: {
    title: "Terms of service",
    intro: "The terms that govern use of the RentOps marketplace.",
    sections: [
      {
        heading: "Our role",
        body: [
          "RentOps operates a marketplace. Listings are provided by independent property partners, and the contract for a stay is between the guest and that partner.",
        ],
      },
      {
        heading: "Bookings and cancellations",
        body: [
          "Each listing states its own duration rules, check-in and check-out times and cancellation policy. Cancellation refunds are calculated from the policy that applied at the time of booking.",
        ],
      },
      {
        heading: "Fees",
        body: [
          "RentOps charges a platform commission on accommodation revenue. Any service charges or cleaning fees set by the partner are shown on the listing before you book.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: "How RentOps collects and uses personal information.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "We collect the information needed to create an account, take a booking and verify identity — such as your name, contact details, and where applicable, verification documents.",
        ],
      },
      {
        heading: "How it is used",
        body: [
          "Information is used to operate the marketplace, process payments, verify users and listings, and communicate booking updates. Partners only receive guest details needed to fulfil a booking.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can manage your profile and notification preferences from your account, and contact us to request access to or deletion of your data.",
        ],
      },
    ],
  },
  careers: {
    title: "Careers",
    intro: "Help us build the infrastructure for accommodation in Nigeria.",
    sections: [
      {
        heading: "Working at RentOps",
        body: [
          "We are a small team building a marketplace that has to handle real money, real inventory and real people. That means careful engineering, clear thinking and a bias for finishing things properly.",
        ],
      },
      {
        heading: "Open roles",
        body: [
          "We do not list live vacancies here yet. If you would like to be considered, send your CV and a short note to the support email below.",
        ],
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((info) => ({ info: [info] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ info: string[] }>;
}): Promise<Metadata> {
  const { info } = await params;
  const page = PAGES[info[0] ?? ""];
  return page ? { title: page.title, description: page.intro } : {};
}

export default async function InfoPageRoute({
  params,
}: {
  params: Promise<{ info: string[] }>;
}) {
  const { info } = await params;
  const page = PAGES[info[0] ?? ""];
  if (!page) notFound();

  return (
    <article className="container-page max-w-3xl py-14">
      <h1 className="font-display text-3xl text-ink-900 sm:text-4xl">{page.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-600">{page.intro}</p>

      <div className="mt-10 space-y-8">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-xl text-ink-900">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-relaxed text-ink-700">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-8">
        <ButtonLink href="/search">Find accommodation</ButtonLink>
        <ButtonLink href="/partners" variant="outline">List your property</ButtonLink>
        <Link
          href="/help"
          className="inline-flex h-11 items-center text-sm font-medium text-brand-700 hover:underline"
        >
          Visit the help centre
        </Link>
      </div>

      <p className="mt-8 text-sm text-ink-500">
        Questions? Email <span className="text-ink-700">{SITE.supportEmail}</span>.
      </p>
    </article>
  );
}
