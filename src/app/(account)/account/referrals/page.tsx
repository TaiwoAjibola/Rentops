import { Gift } from "lucide-react";

import { AccountPageHeader } from "@/components/account/page-header";
import { CustomerActionForm } from "@/components/account/action-form";
import { CopyToClipboard } from "@/components/account/copy-to-clipboard";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { inviteReferral } from "@/server/actions/customer-referrals";

export const metadata = { title: "Referrals" };

const REFERRAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Invited — not booked yet",
  QUALIFIED: "Qualified",
  REWARDED: "Reward paid",
  REJECTED: "Expired / rejected",
};

export default async function ReferralsPage() {
  const user = await requireUser("/account/referrals");

  const referrals = await prisma.referral.findMany({
    where: { referrerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/register?ref=${user.referralCode}`;
  const rewarded = referrals.filter((entry) => entry.status === "REWARDED").length;
  const pending = referrals.filter((entry) => entry.status === "PENDING").length;

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <AccountPageHeader
        eyebrow="Earn"
        title="Invite friends, share the rewards"
        description="When someone you invite completes a stay, you both earn credit on RentOps."
      />

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Your referral code</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code className="rounded-md border border-line-strong bg-ink-50 px-4 py-2 text-lg font-semibold tracking-widest text-ink-900">
            {user.referralCode}
          </code>
          <CopyToClipboard value={shareUrl} label="Copy invite link" />
        </div>
        <p className="mt-2 text-[13px] text-ink-500">Share this link — friends join with your code and get a boost.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-ink-50/40 px-4 py-3">
            <p className="text-2xl font-semibold text-ink-900">{rewarded}</p>
            <p className="text-[13px] text-ink-500">Rewards earned</p>
          </div>
          <div className="rounded-md border border-line bg-ink-50/40 px-4 py-3">
            <p className="text-2xl font-semibold text-ink-900">{pending}</p>
            <p className="text-[13px] text-ink-500">Invites waiting on a first stay</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Invite someone by email</h2>
        <CustomerActionForm action={inviteReferral} submitLabel="Send invite" className="mt-3">
          <Field label="Their email" htmlFor="referral-email" required>
            <Input id="referral-email" name="email" type="email" required placeholder="friend@example.com" />
          </Field>
          <Field label="Personal message" htmlFor="referral-message" hint="Optional — we'll include it in the invite email.">
            <Textarea id="referral-message" name="message" rows={3} />
          </Field>
        </CustomerActionForm>
      </section>

      {referrals.length === 0 ? (
        <EmptyState
          icon={<Gift className="h-5 w-5" aria-hidden />}
          title="No referrals yet"
          description="Share your code or send an invite — you'll both get rewarded after their first stay."
        />
      ) : (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-xl text-ink-900">Your invites</h2>
          <ul className="space-y-2">
            {referrals.map((referral) => (
              <li
                key={referral.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-ink-900">
                    {referral.referredEmail ?? referral.referredUserId?.slice(0, 8) ?? "Invited guest"}
                  </p>
                  <p className="text-[12px] text-ink-500">Invited {formatDate(referral.createdAt)}</p>
                </div>
                <Badge tone={referral.status === "REWARDED" ? "success" : referral.status === "PENDING" ? "warning" : "neutral"}>
                  {REFERRAL_STATUS_LABELS[referral.status] ?? referral.status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
