import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Offset pagination that preserves every active filter.
 *
 * `query` must already exclude `page` — pages pass their normalised search
 * params so operators never lose a filter when moving between pages.
 */
export function Pagination({
  basePath,
  query,
  page,
  pageSize,
  total,
  className,
}: {
  basePath: string;
  query: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5", className)}>
      <p className="text-[13px] text-ink-500">
        Showing <span className="font-medium text-ink-800">{from}</span>–
        <span className="font-medium text-ink-800">{to}</span> of{" "}
        <span className="font-medium text-ink-800">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="inline-flex h-9 items-center rounded-md border border-line-strong px-3 text-[13px] font-medium text-ink-700 transition-colors hover:bg-ink-50"
          >
            Previous
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center rounded-md border border-line px-3 text-[13px] text-ink-400">
            Previous
          </span>
        )}
        <span className="px-1 text-[13px] text-ink-500">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            className="inline-flex h-9 items-center rounded-md border border-line-strong px-3 text-[13px] font-medium text-ink-700 transition-colors hover:bg-ink-50"
          >
            Next
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center rounded-md border border-line px-3 text-[13px] text-ink-400">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
