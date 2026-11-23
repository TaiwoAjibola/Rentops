"use client";

import { useActionState } from "react";
import { PARTNER_PERMISSION_GROUPS, resolvePartnerPermissions, type PartnerPermission } from "@/lib/auth/rbac";
import { partnerPermissionLabels } from "@/lib/auth/rbac";
import type { PartnerMemberRole } from "@prisma/client";
import type { PartnerActionState } from "@/components/partner/action-state";
import { SubmitButton } from "@/components/partner/submit-button";
import { FormError, FormSuccess } from "@/components/ui/field";

const initial: PartnerActionState = null;

export function StaffPermissionsForm({
  memberId,
  role,
  overrides,
  action,
}: {
  memberId: string;
  role: PartnerMemberRole;
  overrides: unknown;
  action: (state: PartnerActionState, formData: FormData) => Promise<PartnerActionState>;
}) {
  const [state, formAction] = useActionState(action, initial);
  const effective = new Set(resolvePartnerPermissions(role, overrides));
  const isCustom = Array.isArray(overrides) && overrides.length > 0;
  const labels = partnerPermissionLabels();

  return (
    <details className="mt-3 rounded-md border border-line bg-ink-50/40">
      <summary className="cursor-pointer list-none px-3 py-2 text-[13px] font-medium text-ink-800 select-none">
        {isCustom ? "Custom permissions" : "Role default permissions"} — click to customize
      </summary>
      <form action={formAction} className="space-y-3 border-t border-line p-3">
        <input type="hidden" name="memberId" value={memberId} />
        {state?.error ? <FormError>{state.error}</FormError> : null}
        {state?.success ? <FormSuccess>{state.success}</FormSuccess> : null}

        <div className="flex flex-wrap gap-4 text-[13px]">
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="permissionsMode" value="defaults" defaultChecked={!isCustom} />
            Use role defaults
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="permissionsMode" value="custom" defaultChecked={isCustom} />
            Set custom permissions
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {PARTNER_PERMISSION_GROUPS.map((group) => (
            <fieldset key={group.group} className="rounded-md border border-line bg-white p-3">
              <legend className="px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">{group.group}</legend>
              <ul className="mt-1 space-y-1.5">
                {group.permissions.map((perm) => (
                  <li key={perm}>
                    <label className="flex items-start gap-2 text-[13px] text-ink-700">
                      <input type="checkbox" name="permissions" value={perm} defaultChecked={effective.has(perm)} className="mt-0.5" />
                      <span>{labels[perm as PartnerPermission]}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>

        <p className="text-[12px] text-ink-500">
          Choose &quot;Use role defaults&quot; to follow the selected role, or &quot;Set custom permissions&quot; and tick the exact capabilities this person needs (delegation/scoping).
        </p>
        <SubmitButton size="sm" pendingLabel="Saving…">Save permissions</SubmitButton>
      </form>
    </details>
  );
}
