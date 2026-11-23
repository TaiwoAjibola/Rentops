"use client";

import { useActionState } from "react";
import { Heart } from "lucide-react";

import { toggleFavourite } from "@/server/actions/booking";
import { cn } from "@/lib/utils";

/**
 * Save / unsave a property.
 *
 * Rendered as a real form so the toggle works without JavaScript; `saved` comes
 * from the server and is refreshed automatically once the action revalidates.
 */
export function FavouriteButton({
  propertyId,
  saved,
  returnTo,
  className,
}: {
  propertyId: string;
  saved: boolean;
  returnTo?: string;
  className?: string;
}) {
  const [, formAction, pending] = useActionState(toggleFavourite, null);

  return (
    <form action={formAction} className={cn("relative z-10", className)}>
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="returnTo" value={returnTo ?? ""} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved properties" : "Save this property"}
        title={saved ? "Remove from saved properties" : "Save this property"}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm transition-all duration-150",
          saved
            ? "border-danger/30 bg-white/95 text-danger"
            : "border-white/60 bg-white/80 text-ink-700 hover:bg-white hover:text-danger",
          pending && "opacity-60",
        )}
      >
        <Heart className={cn("h-[17px] w-[17px]", saved && "fill-danger")} />
      </button>
    </form>
  );
}
