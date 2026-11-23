import { cn } from "@/lib/utils";

export function Logo({
  className,
  tone = "brand",
  showWordmark = true,
}: {
  className?: string;
  tone?: "brand" | "white" | "ink";
  showWordmark?: boolean;
}) {
  const mark = tone === "white" ? "text-white" : tone === "ink" ? "text-ink-900" : "text-brand-700";
  const text = tone === "white" ? "text-white" : "text-ink-900";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("relative inline-flex h-9 w-9 items-center justify-center")}>
        <svg viewBox="0 0 40 40" className="h-9 w-9" fill="none" aria-hidden>
          <path
            d="M20 3.5 5.5 13.2v13.6L20 36.5l14.5-9.7V13.2L20 3.5Z"
            className={tone === "white" ? "stroke-white" : "stroke-brand-700"}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M13.2 21.4V15.2h4.1a2.6 2.6 0 0 1 0 5.2h-4.1Zm0 0v6.2M13.2 21.4h4.8m4.3-6.2h6.2m-6.2 0v12.4m0 0 6.2-12.4"
            className={tone === "white" ? "stroke-white" : "stroke-brand-500"}
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark ? (
        <span className={cn("font-brand text-[18px] leading-none font-semibold", text)}>
          Rent<span className={mark}>Ops</span>
        </span>
      ) : null}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex h-8 w-8 items-center justify-center", className)}>
      <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none" aria-hidden>
        <path d="M20 3.5 5.5 13.2v13.6L20 36.5l14.5-9.7V13.2L20 3.5Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path
          d="M13.2 21.4V15.2h4.1a2.6 2.6 0 0 1 0 5.2h-4.1Zm0 0v6.2M13.2 21.4h4.8m4.3-6.2h6.2m-6.2 0v12.4m0 0 6.2-12.4"
          className="text-brand-500"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
