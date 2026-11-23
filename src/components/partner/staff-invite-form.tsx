"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { PartnerMemberRole } from "@prisma/client";

import { SubmitButton } from "@/components/partner/submit-button";
import { Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/field";
import { PARTNER_ROLE_DESCRIPTIONS, PARTNER_ROLE_LABELS } from "@/lib/constants";

/**
 * Invite form for the staff page.
 *
 * This one form needs the raw invitation token back from the server: it is
 * generated with `inviteToken()`, only its hash is stored, so it can be shown
 * exactly once — in this component, immediately after the invitation is
 * created. Everything else in the portal uses the shared `ActionForm`.
 */
export type StaffInviteState = {
  error?: string;
  success?: string;
  /** Raw token, returned exactly once so the inviter can pass it on. */
  inviteToken?: string;
} | null;

const ROLES = Object.keys(PARTNER_ROLE_LABELS) as PartnerMemberRole[];

export function StaffInviteForm({
  action,
}: {
  action: (state: StaffInviteState, formData: FormData) => Promise<StaffInviteState>;
}) {
  const [state, formAction] = useActionState<StaffInviteState, FormData>(action, null);
  const [copied, setCopied] = useState(false);

  const token = state?.inviteToken ?? "";

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        {state?.error ? <FormError>{state.error}</FormError> : null}
        {state?.success ? <FormSuccess>{state.success}</FormSuccess> : null}

        <Field label="Email address" htmlFor="invite-email" required className="sm:col-span-2">
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="manager@yourbusiness.com"
          />
        </Field>

        <Field label="Role" htmlFor="invite-role" hint={PARTNER_ROLE_DESCRIPTIONS.MANAGER}>
          <Select id="invite-role" name="role" defaultValue="MANAGER">
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {PARTNER_ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Job title" htmlFor="invite-job-title" hint="Optional, shown to your team.">
          <Input id="invite-job-title" name="jobTitle" placeholder="Operations manager" />
        </Field>

        <Field label="Note" htmlFor="invite-message" hint="Optional — included in the invitation.">
          <Textarea id="invite-message" name="message" className="min-h-20" placeholder="Welcome to the team." />
        </Field>

        <div className="flex items-center gap-2.5">
          <SubmitButton size="md" pendingLabel="Sending…">
            Send invitation
          </SubmitButton>
        </div>
      </form>

      {token ? (
        <div className="rounded-md border border-brand-200 bg-brand-50 p-4">
          <p className="text-[13px] font-semibold text-brand-900">Invite token — shown once</p>
          <p className="mt-1 text-[13px] leading-relaxed text-brand-800">
            Copy this token and send it to your team member. They sign in
            {" "}
            <Link href="/login" className="font-medium underline underline-offset-2">
              here
            </Link>
            {" "}
            and paste it to join your account. We never show it again.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={token}
              aria-label="Invite token"
              className="min-w-0 flex-1 rounded-md border border-line-strong bg-white px-3 py-2 font-mono text-[12px] text-ink-900"
            />
            <button
              type="button"
              onClick={copyToken}
              className="inline-flex h-9 shrink-0 items-center rounded-md border border-line-strong bg-white px-3 text-[13px] font-medium text-ink-800 transition-colors hover:bg-ink-50"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
