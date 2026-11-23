import prisma from "@/lib/db";
import { requirePartnerContext } from "@/lib/auth/session";
import { ActionForm } from "@/components/partner/action-form";
import { Badge } from "@/components/ui/badge";
import { Callout, EmptyState } from "@/components/ui/data";
import { SectionHeading } from "@/components/ui/card";
import {
  removeBankAccount,
  saveBankAccount,
  setPrimaryBankAccount,
} from "@/server/actions/partner-onboarding";

export default async function BankAccountsPage() {
  const { partner, can } = await requirePartnerContext();

  const accounts = await prisma.partnerBankAccount.findMany({
    where: { partnerId: partner.id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });

  if (!can("settlement.manage")) {
    return (
      <div className="space-y-6">
        <SectionHeading eyebrow="Settlement" title="Bank accounts" />
        <Callout tone="warning" title="Not available to your role">
          Changing payout bank details requires the <strong>settlement.manage</strong> permission.
          Ask an owner or manager to update these.
        </Callout>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Settlement"
        title="Payout bank accounts"
        description="Where RentOps sends your settlement once a stay is verified."
      />

      {accounts.length === 0 ? (
        <EmptyState title="No bank account yet" description="Add an account so we can pay you." />
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-900">{account.bankName}</p>
                <p className="text-sm text-ink-600">
                  {account.accountNumber} · {account.accountName}
                </p>
              </div>
              {account.isPrimary ? <Badge tone="success">Primary</Badge> : null}

              {!account.isPrimary ? (
                <ActionForm
                  action={setPrimaryBankAccount}
                  hidden={{ accountId: account.id }}
                  submitLabel="Make primary"
                  submitVariant="outline"
                  submitSize="sm"
                  showStatus={false}
                />
              ) : null}

              <ActionForm
                action={removeBankAccount}
                hidden={{ accountId: account.id }}
                submitLabel="Remove"
                submitVariant="danger"
                submitSize="sm"
                showStatus={false}
              />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-display text-xl text-ink-900">Add bank account</h2>
        <div className="mt-4">
          <ActionForm action={saveBankAccount} submitLabel="Save account">
            <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="bankName">
              Bank name
            </label>
            <input
              id="bankName"
              name="bankName"
              required
              placeholder="First Bank of Nigeria"
              className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900"
            />

            <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="accountNumber">
              Account number
            </label>
            <input
              id="accountNumber"
              name="accountNumber"
              required
              inputMode="numeric"
              className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900"
            />

            <label className="mb-1.5 block text-[13px] font-medium text-ink-700" htmlFor="accountName">
              Account name
            </label>
            <input
              id="accountName"
              name="accountName"
              required
              className="h-11 w-full rounded-md border border-line-strong px-3.5 text-ink-900"
            />
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
