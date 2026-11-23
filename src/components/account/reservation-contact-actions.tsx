"use client";

import { useActionState } from "react";
import { LifeBuoy, MessageSquare } from "lucide-react";

import { SubmitButton } from "@/components/account/submit-button";
import { FormError } from "@/components/ui/field";
import { openReservationConversation } from "@/server/actions/customer-reservations";

/**
 * Opens (or continues) the right conversation for a reservation — with the
 * property partner, or with RentOps support.
 */
export function ReservationContactActions({ reference }: { reference: string }) {
  const [state, formAction] = useActionState(openReservationConversation, null);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <form action={formAction}>
        <input type="hidden" name="reference" value={reference} />
        <input type="hidden" name="audience" value="PARTNER" />
        <SubmitButton size="sm" variant="primary" pendingLabel="Opening…">
          <MessageSquare className="h-4 w-4" aria-hidden />
          Message the property
        </SubmitButton>
      </form>

      <form action={formAction}>
        <input type="hidden" name="reference" value={reference} />
        <input type="hidden" name="audience" value="SUPPORT" />
        <SubmitButton size="sm" variant="outline" pendingLabel="Opening…">
          <LifeBuoy className="h-4 w-4" aria-hidden />
          Ask RentOps for help
        </SubmitButton>
      </form>

      {state?.error ? <FormError>{state.error}</FormError> : null}
    </div>
  );
}
