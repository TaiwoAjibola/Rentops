import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Standard masthead for the informational public pages — categories, partners,
 * help, legal and company content — so every page opens with the same rhythm.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  tone = "brand",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  tone?: "brand" | "soft";
  className?: string;
}) {
  const dark = tone === "brand";

  return (
    <section
      className={cn(
        dark ? "bg-brand-900 text-white" : "border-b border-line bg-brand-50",
        className,
      )}
    >
      <div className="container-page py-14 sm:py-20">
        {eyebrow ? (
          <Badge
            tone="neutral"
            className={dark ? "border-white/20 bg-white/10 text-white" : undefined}
          >
            {eyebrow}
          </Badge>
        ) : null}

        <h1
          className={cn(
            "mt-5 max-w-3xl text-balance font-display text-3xl leading-tight sm:text-4xl",
            dark ? "text-white" : "text-ink-900",
          )}
        >
          {title}
        </h1>

        {description ? (
          <p
            className={cn(
              "mt-4 max-w-2xl text-[15px] leading-relaxed",
              dark ? "text-white/85" : "text-ink-600",
            )}
          >
            {description}
          </p>
        ) : null}

        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}

/** Closing call-to-action band used across the informational pages. */
export function ClosingCta({
  title,
  description,
  primary,
  secondary,
  tone = "brand",
  children,
}: {
  title: string;
  description: string;
  primary: ReactNode;
  secondary?: ReactNode;
  tone?: "brand" | "soft";
  children?: ReactNode;
}) {
  const dark = tone === "brand";

  return (
    <section className="container-page mt-20">
      <div
        className={cn(
          "rounded-lg px-6 py-14 text-center sm:px-12",
          dark ? "bg-brand-900 text-white" : "bg-brand-50",
        )}
      >
        <h2
          className={cn(
            "mx-auto max-w-2xl text-balance font-display text-2xl leading-tight sm:text-3xl",
            dark ? "text-white" : "text-ink-900",
          )}
        >
          {title}
        </h2>
        <p className={cn("mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed", dark ? "text-white/85" : "text-ink-600")}>
          {description}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {primary}
          {secondary}
        </div>
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}
