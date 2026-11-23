"use client";

import { useRef } from "react";

import { switchPartnerContext } from "@/server/actions/partner-auth";
import { Label } from "@/components/ui/field";

/**
 * Lets an operator who belongs to more than one partner organisation switch the
 * account they are acting for. Server side the switch is validated against real
 * memberships, so choosing another id is impossible.
 */
export function PartnerContextSwitcher({
  partnerId,
  memberships,
}: {
  partnerId: string;
  memberships: { id: string; businessName: string; roleLabel: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  if (memberships.length < 2) return null;

  return (
    <form ref={formRef} action={switchPartnerContext} className="flex items-center gap-2">
      <Label htmlFor="partner-switch" className="mb-0 hidden text-[12px] text-ink-500 xl:block">
        Acting for
      </Label>
      <select
        id="partner-switch"
        name="partnerId"
        defaultValue={partnerId}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-9 max-w-[190px] cursor-pointer rounded-md border border-line-strong bg-white px-2.5 text-[13px] text-ink-800"
      >
        {memberships.map((membership) => (
          <option key={membership.id} value={membership.id}>
            {membership.businessName} · {membership.roleLabel}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-9 rounded-md border border-line-strong px-3 text-[13px]">
          Switch
        </button>
      </noscript>
    </form>
  );
}
