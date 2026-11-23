import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { PartnerRegisterForm } from "@/components/partner/register-form";
import { SetupShell } from "@/components/partner/setup-shell";
import { getPartnerContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "List your property on RentOps",
  description:
    "Register as a RentOps partner: hotels, shortlet owners, serviced apartment operators and landlords.",
};

export default async function PartnerRegisterPage() {
  const existing = await getPartnerContext();
  if (existing) redirect("/partner");

  return (
    <SetupShell
      footer={
        <p>
          RentOps reviews every partner before payouts are released. Verification usually completes within two
          working days of receiving complete documents.
        </p>
      }
    >
      <a
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to RentOps
      </a>

      <h1 className="font-display text-[30px] leading-tight text-ink-900 sm:text-[34px]">
        List your property on RentOps
      </h1>
      <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-ink-600">
        One account for short stays and long leases. You keep control of your inventory, your pricing and your
        availability — RentOps handles discovery, payment and guest support.
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { title: "You set the rules", body: "Booking mode, minimum stay, check-in days, cancellation policy." },
          { title: "You set the price", body: "Nightly, weekly, monthly or annual — plus seasonal promotions." },
          { title: "You get paid", body: "Commission is deducted; the rest is settled to your bank account." },
        ].map((item) => (
          <div key={item.title} className="rounded-lg border border-line bg-white p-4 shadow-xs">
            <dt className="text-[13px] font-semibold text-ink-900">{item.title}</dt>
            <dd className="mt-1 text-[13px] leading-relaxed text-ink-500">{item.body}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 inline-flex items-start gap-2 rounded-md border border-brand-100 bg-brand-50 px-4 py-3 text-[13px] leading-relaxed text-brand-800">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Registering does not publish anything. Your first listing goes live only after RentOps approves it.
        </span>
      </div>

      <div className="mt-6">
        <PartnerRegisterForm />
      </div>
    </SetupShell>
  );
}
