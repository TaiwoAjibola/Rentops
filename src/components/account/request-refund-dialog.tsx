"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SubmitButton } from "@/components/account/submit-button";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { requestReservationRefund } from "@/server/actions/customer-reservations";
import { formatMoney } from "@/lib/money";

export function RequestRefundDialog({
  reference,
  grossAmount,
  currency,
}: {
  reference: string;
  grossAmount: number;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(requestReservationRefund, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Request a refund
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title={`Request a refund for ${reference}`}
        description="Tell us what happened. A RentOps support agent reviews every request."
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Not now
            </Button>
            <form id={`refund-form-${reference}`} action={formAction}>
              <input type="hidden" name="reference" value={reference} />
              <SubmitButton size="sm" pendingLabel="Submitting…">
                Submit refund request
              </SubmitButton>
            </form>
          </div>
        }
      >
        <div className="space-y-4">
          {state?.error ? <FormError>{state.error}</FormError> : null}
          {state?.success ? <FormSuccess>{state.success}</FormSuccess> : null}

          <Field
            label="Why are you requesting a refund?"
            htmlFor={`refund-reason-${reference}`}
            required
            hint="Include dates and anything the property said, if it helps."
          >
            <Textarea
              id={`refund-reason-${reference}`}
              form={`refund-form-${reference}`}
              name="reason"
              rows={4}
              placeholder="e.g. the apartment was not as described and I checked out early"
              required
            />
          </Field>

          <Field label="What outcome are you hoping for?" htmlFor={`refund-outcome-${reference}`}>
            <Input
              id={`refund-outcome-${reference}`}
              form={`refund-form-${reference}`}
              name="desiredOutcome"
              placeholder={`e.g. full refund of ${formatMoney(grossAmount, currency)}`}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
