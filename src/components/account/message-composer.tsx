"use client";

import { useActionState, useEffect, useState } from "react";
import { Send } from "lucide-react";

import { SubmitButton } from "@/components/account/submit-button";
import { FormError, Textarea } from "@/components/ui/field";
import { sendCustomerMessage } from "@/server/actions/customer-messages";

/**
 * Thread composer. The textarea clears as soon as the action is dispatched and
 * the sent text is echoed back until the server round-trip lands, so the thread
 * never feels stalled.
 */
export function MessageComposer({
  conversationId,
  placeholder = "Write a message…",
}: {
  conversationId: string;
  placeholder?: string;
}) {
  const [state, formAction] = useActionState(sendCustomerMessage, null);
  const [echo, setEcho] = useState<string | null>(null);

  useEffect(() => {
    if (state) setEcho(null);
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const field = event.currentTarget.elements.namedItem("body");
        const value = field instanceof HTMLTextAreaElement ? field.value.trim() : "";
        setEcho(value || null);
      }}
      className="border-t border-line bg-white p-4"
    >
      <input type="hidden" name="conversationId" value={conversationId} />

      <label htmlFor="composer-body" className="sr-only">
        Message
      </label>
      <Textarea
        id="composer-body"
        name="body"
        rows={3}
        placeholder={placeholder}
        className="min-h-20 resize-y"
        required
      />

      {echo ? (
        <p className="mt-2 flex items-start gap-2 text-[13px] text-ink-500">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand-600" aria-hidden />
          <span className="line-clamp-2">Sending: {echo}</span>
        </p>
      ) : null}

      {state?.error ? (
        <div className="mt-2">
          <FormError>{state.error}</FormError>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[12px] text-ink-500">
          Keep payments and contact details on RentOps — that is how we protect you.
        </p>
        <SubmitButton size="sm" pendingLabel="Sending…">
          <Send className="h-4 w-4" aria-hidden />
          Send
        </SubmitButton>
      </div>
    </form>
  );
}
