import { EmptyState } from "@/components/ui/data";
import { cn } from "@/lib/utils";

/**
 * Audit before/after viewer.
 *
 * Both snapshots are flattened to dot-paths so an operator can see exactly which
 * fields changed, even when the payload is deeply nested JSON.
 */

type Flat = Record<string, string>;

function flatten(value: unknown, prefix = "", out: Flat = {}): Flat {
  if (value === null || value === undefined) {
    out[prefix] = "—";
    return out;
  }
  if (Array.isArray(value)) {
    out[prefix] = value.length === 0 ? "[]" : value.map((entry) => stringify(entry)).join(", ");
    return out;
  }
  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      flatten(entry, prefix ? `${prefix}.${key}` : key, out);
    }
    if (Object.keys(value as object).length === 0) out[prefix] = "{}";
    return out;
  }
  out[prefix] = stringify(value);
  return out;
}

function stringify(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function AuditDiff({ before, after }: { before: unknown; after: unknown }) {
  if (before === null && after === null) {
    return <EmptyState title="No snapshot recorded" description="This action did not store a before/after payload." />;
  }

  const beforeFlat = before ? flatten(before) : {};
  const afterFlat = after ? flatten(after) : {};
  const keys = Array.from(new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)])).sort();

  if (keys.length === 0) {
    return <EmptyState title="Empty snapshot" description="The recorded payload contained no fields." />;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-line bg-ink-50/60">
            <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
              Field
            </th>
            <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
              Before
            </th>
            <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
              After
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {keys.map((key) => {
            const from = beforeFlat[key] ?? "—";
            const to = afterFlat[key] ?? "—";
            const changed = from !== to;
            return (
              <tr key={key} className={changed ? "bg-brand-50/40" : undefined}>
                <td className="px-4 py-2 font-mono text-[12px] text-ink-700">{key}</td>
                <td className={cn("px-4 py-2", changed ? "text-danger line-through decoration-danger/40" : "text-ink-500")}>
                  {from}
                </td>
                <td className={cn("px-4 py-2", changed ? "font-medium text-success" : "text-ink-500")}>{to}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Raw JSON viewer for payment webhooks and other provider payloads. */
export function JsonBlock({ value, className }: { value: unknown; className?: string }) {
  if (value === null || value === undefined) {
    return <p className="text-[13px] text-ink-500">No payload recorded.</p>;
  }
  return (
    <pre
      className={cn(
        "max-h-96 overflow-auto rounded-md border border-line bg-ink-950 px-4 py-3 text-[12px] leading-relaxed text-ink-100",
        className,
      )}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
