"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { SubmitButton } from "@/components/account/submit-button";
import { Button } from "@/components/ui/button";
import { Field, FormError, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { cancelCustomerReservation } from "@/server/actions/customer-reservations";
import { formatMoney } from "@/lib/money";

export function CancelReservationDialog({
  reference,
  propertyName,
  refundPercent,
  refundAmount,
  currency,
  policyName,
  checkInLabel,
}: {
  reference: string;
  propertyName: string;
  refundPercent: number;
  refundAmount: number;
  currency: string;
  policyName: string | null;
  checkInLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(cancelCustomerReservation, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Cancel reservation
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title={`Cancel ${reference}?`}
        description="This cannot be undone. Review what you will be refunded before confirming."
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Keep my booking
            </Button>
            <form id={`cancel-form-${reference}`} action={formAction}>
              <input type="hidden" name="reference" value={reference} />
              <SubmitButton variant="danger" size="sm" pendingLabel="Cancelling…">
                Yes, cancel this booking
              </SubmitButton>
            </form>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-3 rounded-md border border-warning/25 bg-warning-soft px-4 py-3 text-[13px] leading-relaxed text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">
                You will be refunded {refundPercent}% — {formatMoney(refundAmount, currency)}
              </p>
              <p className="mt-1">
                Calculated from the {policyName ?? "standard"} cancellation policy for a stay at{" "}
                {propertyName} checking in on {checkInLabel}.
              </p>
            </div>
          </div>

          {refundPercent < 100 ? (
            <Field
              label="Anything we should know? (optional)"
              htmlFor={`cancel-reason-${reference}`}
              hint="This helps us advocate for you if you later request a refund."
            >
              <Textarea
                id={`cancel-reason-${reference}`}
                name="reason"
                form={`cancel-form-${reference}`}
                rows={3}
                placeholder="e.g. my flight was cancelled"
              />
            </Field>
          ) : null}

          {state?.error ? <FormError>{state.error}</FormError> : null}
        </div>
      </Modal>
    </>
  );
}
