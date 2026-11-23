import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

const COLUMNS = [
  {
    title: "Discover",
    links: [
      { href: "/search", label: "Find accommodation" },
      { href: "/categories", label: "Browse categories" },
      { href: "/destinations", label: "Popular destinations" },
      { href: "/how-it-works", label: "How RentOps works" },
    ],
  },
  {
    title: "For property partners",
    links: [
      { href: "/partners", label: "List your property" },
      { href: "/partner/register", label: "Become a partner" },
      { href: "/partner", label: "Partner dashboard" },
      { href: "/partners/pricing", label: "Commissions & fees" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help centre" },
      { href: "/contact", label: "Contact us" },
      { href: "/account/support", label: "Raise a ticket" },
      { href: "/trust-and-safety", label: "Trust & safety" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About RentOps" },
      { href: "/careers", label: "Careers" },
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-white">
      <div className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-ink-600">
              {SITE.description}
            </p>
            <dl className="mt-6 space-y-1.5 text-[14px] text-ink-600">
              <div className="flex gap-2">
                <dt className="sr-only">Email</dt>
                <dd>{SITE.supportEmail}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="sr-only">Phone</dt>
                <dd>{SITE.phone}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="sr-only">Location</dt>
                <dd>{SITE.address}</dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[14px] text-ink-700 transition-colors hover:text-brand-700"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-6 border-t border-line pt-10 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-md">
            <h3 className="font-display text-lg text-ink-900">Stay ahead of new listings</h3>
            <p className="mt-1.5 text-[14px] text-ink-600">
              Get verified accommodation offers and destination guides from the RentOps team.
            </p>
            <form className="mt-4 flex gap-2" action="/subscribe" method="post">
              <Input type="email" name="email" required placeholder="you@example.com" aria-label="Email address" />
              <Button type="submit" className="shrink-0">
                Subscribe
              </Button>
            </form>
          </div>

          <div className="text-[13px] text-ink-500 md:text-right">
            <p>&copy; {new Date().getFullYear()} RentOps Technologies. All rights reserved.</p>
            <p className="mt-1">RentOps is a marketplace. Listings are provided by verified property partners.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
