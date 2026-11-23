"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";

import { markNotificationRead } from "@/server/actions/customer-notifications";
import { cn } from "@/lib/utils";

export function MarkReadButton({ notificationId, className }: { notificationId: string; className?: string }) {
  const [state, formAction] = useActionState(markNotificationRead, null);

  return (
    <form action={formAction} className={cn("shrink-0", className)}>
      <input type="hidden" name="notificationId" value={notificationId} />
      <button
        type="submit"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12px] font-medium text-ink-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        {state?.error ? "Try again" : "Mark read"}
      </button>
    </form>
  );
}
