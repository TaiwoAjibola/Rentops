"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/account/submit-button";
import {
  approveReservationAction,
  cancelReservationAction,
  checkInAction,
  checkOutAction,
  declineReservationAction,
} from "@/server/actions/partner-units";
import type { PartnerActionState } from "@/components/partner/action-state";

/**
 * Partner-side lifecycle controls for a single reservation.
 *
 * Each action re-checks the partner's permission and ownership server-side, so
 * hiding a button here is cosmetic, never the security boundary.
 */
export function ReservationActions({
  reservationId,
  status,
  currency,
  refundAmount,
}: {
  reservationId: string;
  status: string;
  currency: string;
  refundAmount: number;
}) {
  const [approveState, approve] = useActionState<PartnerActionState, FormData>(
    approveReservationAction,
    null,
  );
  const [declineState, decline] = useActionState<PartnerActionState, FormData>(
    declineReservationAction,
    null,
  );
  const [inState, checkIn] = useActionState<PartnerActionState, FormData>(checkInAction, null);
  const [outState, checkOut] = useActionState<PartnerActionState, FormData>(checkOutAction, null);
  const [cancelState, cancel] = useActionState<PartnerActionState, FormData>(
    cancelReservationAction,
    null,
  );

  const states = [approveState, declineState, inState, outState, cancelState];
  const error = states.find((entry) => entry?.error)?.error;
  const success = states.find((entry) => entry?.success)?.success;

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="font-display text-xl text-ink-900">Actions</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {status === "PENDING_APPROVAL" ? (
          <>
            <form action={approve}>
              <input type="hidden" name="reservationId" value={reservationId} />
              <SubmitButton pendingLabel="Approving…">Approve</SubmitButton>
            </form>
            <form action={decline}>
              <input type="hidden" name="reservationId" value={reservationId} />
              <input type="hidden" name="reason" value="Declined by property partner" />
              <SubmitButton variant="outline" pendingLabel="Declining…">
                Decline
              </SubmitButton>
            </form>
          </>
        ) : null}

        {status === "CONFIRMED" ? (
          <form action={checkIn}>
            <input type="hidden" name="reservationId" value={reservationId} />
            <SubmitButton pendingLabel="Recording…">Record check-in</SubmitButton>
          </form>
        ) : null}

        {status === "CHECKED_IN" ? (
          <form action={checkOut}>
            <input type="hidden" name="reservationId" value={reservationId} />
            <SubmitButton pendingLabel="Recording…">Record check-out</SubmitButton>
          </form>
        ) : null}

        {["CONFIRMED", "PENDING_PAYMENT", "CHECKED_IN"].includes(status) ? (
          <form action={cancel}>
            <input type="hidden" name="reservationId" value={reservationId} />
            <SubmitButton variant="danger" pendingLabel="Cancelling…">
              Cancel booking
            </SubmitButton>
          </form>
        ) : null}
      </div>

      {["CONFIRMED", "CHECKED_IN"].includes(status) ? (
        <p className="mt-3 text-[13px] text-ink-500">
          Cancelling may trigger a refund of up to {currency} {Math.round(refundAmount / 100)} under
          the property's cancellation policy.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-success">{success}</p> : null}
    </section>
  );
}
