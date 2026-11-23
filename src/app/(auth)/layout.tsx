import Link from "next/link";
import { BadgeCheck, CalendarCheck, ShieldCheck, Wallet } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { SITE } from "@/lib/constants";

const HIGHLIGHTS = [
  {
    icon: BadgeCheck,
    title: "Verified places, verified people",
    body: "Listings are reviewed before they go live, and both sides can verify identity before a long lease.",
  },
  {
    icon: Wallet,
    title: "Clear pricing, always with its period",
    body: "Every price shows whether it is per night, per week, per month or per year — before you pay.",
  },
  {
    icon: CalendarCheck,
    title: "One night or ten years",
    body: "Short stays and long leases run on the same booking pipeline, so nothing changes as you extend.",
  },
  {
    icon: ShieldCheck,
    title: "Payments held safely",
    body: "Pay through RentOps and your money is only released to the property after you check in.",
  },
];

const PHOTO =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80";

/**
 * Authentication chrome: a brand panel beside a centred card. Responsive — the
 * panel folds away on small screens and the form takes the full width.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-950 lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{ backgroundImage: `url("${PHOTO}")` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/85 via-brand-950/80 to-brand-900/95" aria-hidden />

        <div className="relative z-10 p-10 xl:p-14">
          <Link href="/" aria-label={`${SITE.name} home`}>
            <Logo tone="white" />
          </Link>
          <p className="mt-14 max-w-md font-display text-[34px] leading-[1.15] text-white text-balance xl:text-[40px]">
            Somewhere good to stay — tonight, this month, or for years.
          </p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-brand-100">
            {SITE.name} connects you directly with hotels, shortlet owners, serviced apartment
            operators and landlords across Nigeria.
          </p>
        </div>

        <div className="relative z-10 grid gap-5 p-10 xl:p-14">
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex gap-3.5">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-brand-100 ring-1 ring-white/15">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-brand-200">{item.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Form column */}
      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" className="lg:invisible" aria-label={`${SITE.name} home`}>
            <Logo />
          </Link>
          <Link
            href="/properties"
            className="text-[13px] font-medium text-ink-500 transition-colors hover:text-brand-700"
          >
            Browse properties
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8 lg:px-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>

        <footer className="border-t border-line px-5 py-5 text-[12px] text-ink-500 sm:px-8 lg:px-12">
          <p>
            Need a hand? Email{" "}
            <a href={`mailto:${SITE.supportEmail}`} className="font-medium text-brand-700 hover:underline">
              {SITE.supportEmail}
            </a>{" "}
            or call {SITE.phone}.
          </p>
        </footer>
      </main>
    </div>
  );
}
