"use client";

import { signInAsDemo } from "@/server/actions/demo-signin";
import { SubmitButton } from "@/components/account/submit-button";

/**
 * Demo sign-in panel.
 *
 * Shows every seeded account with its shared password and lets you jump straight
 * in with one click — this is a prototype shortcut, not real authentication.
 */

const PASSWORD = "Password123!";

const ACCOUNTS = [
  { group: "Guest / renter", next: "/account", items: [
    { email: "chidi@example.com", label: "Chidi Okafor", note: "Most bookings" },
    { email: "amara@example.com", label: "Amara Nwosu", note: "Confirmed + completed stay" },
  ]},
  { group: "Property partner — owner", next: "/partner", items: [
    { email: "owner.grand@rentops.test", label: "Ibrahim Musa", note: "Grand Residences Hotel" },
    { email: "owner.shortlets@rentops.test", label: "Temi Ogundipe", note: "Lekki Shortlets" },
  ]},
  { group: "RentOps staff", next: "/admin", items: [
    { email: "admin@rentops.test", label: "Ada Okonkwo", note: "Super admin — full access" },
    { email: "ops@rentops.test", label: "Tunde Bakare", note: "Operations" },
  ]},
];

export function DemoSignIn({ next }: { next: string }) {
  return (
    <div className="rounded-lg border border-line bg-ink-50/70 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-700">
          Demo sign-in
        </h2>
        <p className="text-[13px] text-ink-600">
          Password: <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-ink-900">{PASSWORD}</code>
        </p>
      </div>
      <p className="mt-1.5 text-[13px] text-ink-500">
        Prototype shortcut — click any account to sign in instantly. No typing required.
      </p>

      <div className="mt-4 space-y-4">
        {ACCOUNTS.map((section) => (
          <div key={section.group}>
            <p className="text-[12px] font-medium text-ink-500">{section.group}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {section.items.map((account) => (
                <form key={account.email} action={signInAsDemo}>
                  <input type="hidden" name="email" value={account.email} />
                  <input type="hidden" name="next" value={next} />
                  <SubmitButton
                    variant="outline"
                    size="sm"
                    pendingLabel="Signing in…"
                    title={`${account.email} — ${account.note}`}
                  >
                    {account.label}
                  </SubmitButton>
                </form>
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-ink-400">
              {section.items.map((i) => i.email).join("  ·  ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
