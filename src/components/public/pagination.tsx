import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { hrefWith, type RawSearchParams } from "@/components/public/query";
import { cn } from "@/lib/utils";

/** Pagination built from real links so every page of results is addressable. */
export function Pagination({
  page,
  pageCount,
  params,
  basePath = "/search",
}: {
  page: number;
  pageCount: number;
  params: RawSearchParams;
  basePath?: string;
}) {
  if (pageCount <= 1) return null;

  const pages = pageWindow(page, pageCount);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link
          href={hrefWith(basePath, params, { page: page - 1 })}
          aria-label="Previous page"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line-strong bg-white text-ink-700 transition-colors hover:bg-ink-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : null}

      {pages.map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-ink-400" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefWith(basePath, params, { page: entry })}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              "inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-[14px] font-medium transition-colors",
              entry === page
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-line-strong bg-white text-ink-700 hover:bg-ink-50",
            )}
          >
            {entry}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link
          href={hrefWith(basePath, params, { page: page + 1 })}
          aria-label="Next page"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line-strong bg-white text-ink-700 transition-colors hover:bg-ink-50"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </nav>
  );
}

function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  const pages: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) pages.push("gap");
  for (let index = start; index <= end; index += 1) pages.push(index);
  if (end < pageCount - 1) pages.push("gap");
  if (pageCount > 1) pages.push(pageCount);

  return Array.from(new Set(pages));
}
