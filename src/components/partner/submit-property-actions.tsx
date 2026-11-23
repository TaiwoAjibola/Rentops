"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/account/submit-button";
import { submitPropertyForReview, withdrawProperty } from "@/server/actions/partner-properties";
import type { PartnerActionState } from "@/components/partner/action-state";

/**
 * Moves a listing between partner draft state and the RentOps review queue.
 *
 * Only rendered for properties that are not already approved.
 */
export function SubmitPropertyActions({
  propertyId,
  status,
}: {
  propertyId: string;
  status: string;
}) {
  const [submitState, submitAction] = useActionState<PartnerActionState, FormData>(
    submitPropertyForReview,
    null,
  );
  const [withdrawState, withdrawAction] = useActionState<PartnerActionState, FormData>(
    withdrawProperty,
    null,
  );

  const message = submitState?.error ?? withdrawState?.error ?? submitState?.success ?? withdrawState?.success;

  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <h2 className="font-display text-xl text-ink-900">Publishing</h2>
      <p className="mt-2 text-sm text-ink-600">
        {status === "SUBMITTED" || status === "UNDER_REVIEW"
          ? "RentOps is reviewing this listing. We will notify you when a decision is made."
          : "Submit this listing so RentOps can review and publish it."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {status !== "SUBMITTED" && status !== "UNDER_REVIEW" ? (
          <form action={submitAction}>
            <input type="hidden" name="propertyId" value={propertyId} />
            <SubmitButton pendingLabel="Submitting…">Submit for review</SubmitButton>
          </form>
        ) : (
          <form action={withdrawAction}>
            <input type="hidden" name="propertyId" value={propertyId} />
            <SubmitButton variant="outline" pendingLabel="Withdrawing…">
              Withdraw from review
            </SubmitButton>
          </form>
        )}
      </div>

      {message ? (
        <p className={`mt-3 text-sm ${submitState?.error || withdrawState?.error ? "text-danger" : "text-success"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
