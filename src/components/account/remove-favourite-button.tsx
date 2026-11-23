"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { HeartOff, Loader2 } from "lucide-react";

import { removeFavourite } from "@/server/actions/customer-favourites";
import { cn } from "@/lib/utils";

function RemoveButton({ propertyName, error }: { propertyName: string; error?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`Remove ${propertyName} from favourites`}
      title={error ?? `Remove ${propertyName} from favourites`}
      className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-ink-500 transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <HeartOff className="h-4 w-4" aria-hidden />}
      <span className="hidden sm:inline">Remove</span>
    </button>
  );
}

export function RemoveFavouriteButton({
  propertyId,
  propertyName,
  className,
}: {
  propertyId: string;
  propertyName: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(removeFavourite, null);

  return (
    <form action={formAction} className={cn("shrink-0", className)}>
      <input type="hidden" name="propertyId" value={propertyId} />
      <RemoveButton propertyName={propertyName} error={state?.error} />
      {state?.error ? (
        <p className="sr-only" role="status">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
