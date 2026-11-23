"use client";

import { useActionState } from "react";

import { Field, Input, Textarea, FormError, FormSuccess } from "@/components/ui/field";
import { SubmitButton } from "@/components/account/submit-button";
import { payForBooking } from "@/server/actions/booking";

/**
 * Checkout form: phone and anything the property should know, then payment.
 * On submit the server hands off to the payment provider (or the sandbox in
 * development) by redirect.
 */
export function CheckoutPaymentForm({ reference }: { reference: string }) {
  const [state, formAction] = useActionState(payForBooking, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="reference" value={reference} />
      {state?.error ? <FormError>{state.error}</FormError> : null}
      {state?.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <Field label="Phone number" htmlFor="checkout-phone" hint="The property may call you to confirm arrival details.">
        <Input id="checkout-phone" name="phone" type="tel" autoComplete="tel" />
      </Field>

      <Field label="Special requests" htmlFor="checkout-requests" hint="Airport transfer, dietary needs, early check-in…">
        <Textarea id="checkout-requests" name="specialRequests" rows={3} />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Preparing payment…" size="lg">
        Proceed to secure payment
      </SubmitButton>
    </form>
  );
}
