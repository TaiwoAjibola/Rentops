import type { Property, PropertyVerificationCheck, VerificationType } from "@prisma/client";

import { Checkbox, Field, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableCell, TableRow } from "@/components/ui/data";
import {
  approveProperty,
  rejectProperty,
  requestPropertyInfo,
  reviewPropertyCheck,
  savePropertyAdminNotes,
  setPropertyListingActive,
} from "@/server/actions/admin-properties";
import { ActionForm } from "@/components/admin/action-form";
import { ConfirmSubmit } from "@/components/admin/submit-button";
import { Panel, VerificationStatusBadge, When } from "@/components/admin/ui";
import { VERIFICATION_TYPE_LABELS } from "@/lib/constants";

type ReviewProperty = Pick<
  Property,
  | "id"
  | "name"
  | "status"
  | "isActive"
  | "verificationLevel"
  | "verificationBadge"
  | "adminNotes"
  | "rejectionReason"
>;

const CHECK_TYPES: VerificationType[] = ["IDENTITY", "OWNERSHIP", "LOCATION", "MEDIA", "INSPECTION"];

/** The moderation control panel shown beside every property preview. */
export function PropertyModerationPanel({
  property,
  canReview,
  canManage,
}: {
  property: ReviewProperty;
  canReview: boolean;
  canManage: boolean;
}) {
  return (
    <div className="space-y-4">
      <Panel title="Moderation" description="Decisions are audit-logged and the partner is notified.">
        {!canReview ? (
          <p className="text-[13px] text-ink-600">
            Your role can view this listing but not change its review status. Contact an administrator with{" "}
            <span className="font-mono text-[12px]">property.review</span> permission.
          </p>
        ) : (
          <div className="space-y-5">
            <ActionForm
              action={approveProperty}
              hidden={{ propertyId: property.id }}
              submitLabel={property.status === "APPROVED" ? "Re-approve listing" : "Approve & publish"}
              submitPendingLabel="Approving…"
              resetOnSuccess
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Verification level" htmlFor="verificationLevel">
                  <Select name="verificationLevel" id="verificationLevel" defaultValue={property.verificationLevel}>
                    <option value="NONE">Not verified</option>
                    <option value="BASIC">Basic</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="PREMIUM">Premium verified</option>
                  </Select>
                </Field>
                <Field label="Display badge" htmlFor="verificationBadge">
                  <label className="flex h-11 items-center gap-2 text-[14px] text-ink-700">
                    <Checkbox name="verificationBadge" id="verificationBadge" defaultChecked={property.verificationBadge} />
                    Show verification badge publicly
                  </label>
                </Field>
              </div>
              <Field label="Note to partner (optional)" htmlFor="approveNote">
                <Textarea name="note" id="approveNote" placeholder="Anything the partner should know" />
              </Field>
            </ActionForm>

            <div className="border-t border-line pt-5">
              <ActionForm
                action={requestPropertyInfo}
                hidden={{ propertyId: property.id }}
                submitLabel="Request more information"
                submitPendingLabel="Sending…"
                submitVariant="secondary"
                resetOnSuccess
              >
                <Field
                  label="What is missing?"
                  hint="Sent to the partner as the reason the listing is not approved yet."
                  htmlFor="adminNotes"
                >
                  <Textarea name="adminNotes" id="adminNotes" placeholder="e.g. Upload a utility bill showing the property address." />
                </Field>
              </ActionForm>
            </div>

            <div className="border-t border-line pt-5">
              <ActionForm
                action={rejectProperty}
                hidden={{ propertyId: property.id }}
                resetOnSuccess
              >
                <Field label="Rejection reason" hint="Stored on the listing and emailed to the partner." htmlFor="rejectionReason">
                  <Textarea
                    name="rejectionReason"
                    id="rejectionReason"
                    defaultValue={property.rejectionReason ?? ""}
                    placeholder="Explain exactly why this listing cannot be published"
                  />
                </Field>
                <ConfirmSubmit label="Reject listing" confirmLabel="Yes, reject" pendingLabel="Rejecting…" />
              </ActionForm>
            </div>
          </div>
        )}

        {canManage ? (
          <div className="mt-5 border-t border-line pt-5">
            <ActionForm
              action={setPropertyListingActive}
              hidden={{ propertyId: property.id, active: property.isActive ? "false" : "true" }}
            >
              <p className="text-[13px] text-ink-600">
                {property.isActive
                  ? "Suspending hides the listing from search without changing its review status."
                  : "Reinstating makes an approved listing visible to customers again."}
              </p>
              <div className="mt-3">
                <ConfirmSubmit
                  label={property.isActive ? "Suspend listing" : "Reinstate listing"}
                  confirmLabel={property.isActive ? "Yes, suspend" : "Yes, reinstate"}
                  variant={property.isActive ? "danger" : "primary"}
                  pendingLabel="Working…"
                />
              </div>
            </ActionForm>
          </div>
        ) : null}
      </Panel>

      {canReview ? (
        <Panel title="Internal notes" description="Visible to RentOps staff only.">
          <ActionForm
            action={savePropertyAdminNotes}
            hidden={{ propertyId: property.id }}
            submitLabel="Save notes"
            submitPendingLabel="Saving…"
          >
            <Field label="Moderation notes" htmlFor="adminNotesField">
              <Textarea
                name="adminNotes"
                id="adminNotesField"
                defaultValue={property.adminNotes ?? ""}
                placeholder="Context for the next reviewer"
              />
            </Field>
          </ActionForm>
        </Panel>
      ) : null}
    </div>
  );
}

/** Per-check due diligence rows (identity, ownership, location, media, inspection). */
export function PropertyVerificationChecks({
  propertyId,
  checks,
  canReview,
}: {
  propertyId: string;
  checks: PropertyVerificationCheck[];
  canReview: boolean;
}) {
  const byType = new Map(checks.map((check) => [check.type, check]));

  return (
    <Panel
      title="Verification checks"
      description="Each check is recorded independently; completed checks support a higher verification level."
      bodyClassName="px-0 py-0"
    >
      <DataTable headers={["Check", "Status", "Note", "Completed", "Decision"]}>
        {CHECK_TYPES.map((type) => {
          const check = byType.get(type);
          return (
            <TableRow key={type}>
              <TableCell className="font-medium text-ink-900">{VERIFICATION_TYPE_LABELS[type]}</TableCell>
              <TableCell>
                {check ? (
                  <VerificationStatusBadge status={check.status} />
                ) : (
                  <Badge tone="neutral">Not started</Badge>
                )}
              </TableCell>
              <TableCell className="max-w-[14rem] text-[13px] text-ink-600">{check?.note ?? "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-[13px] text-ink-500">
                <When value={check?.completedAt ?? null} />
              </TableCell>
              <TableCell>
                {canReview ? (
                  <ActionForm
                    action={reviewPropertyCheck}
                    hidden={{ propertyId, type }}
                    className="flex flex-wrap items-center gap-2"
                    showStatus={false}
                    resetOnSuccess
                  >
                    <Select name="status" defaultValue={check?.status ?? "VERIFIED"} className="h-9 w-32 text-[13px]" aria-label={`${type} status`}>
                      <option value="VERIFIED">Verified</option>
                      <option value="IN_REVIEW">In review</option>
                      <option value="PENDING">Pending</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="EXPIRED">Expired</option>
                    </Select>
                    <input
                      name="note"
                      placeholder="Note"
                      aria-label="Check note"
                      className="h-9 w-36 rounded-md border border-line-strong px-2.5 text-[13px]"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center rounded-md bg-brand-700 px-3 text-[13px] font-medium text-white transition-colors hover:bg-brand-800"
                    >
                      Save
                    </button>
                  </ActionForm>
                ) : (
                  <span className="text-[13px] text-ink-500">Read only</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>
    </Panel>
  );
}
