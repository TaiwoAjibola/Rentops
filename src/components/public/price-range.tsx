import { Checkbox, Label, Select } from "@/components/ui/field";

/**
 * Budget range.
 *
 * Amounts are entered in naira (major units) because that is what people think
 * in; `parseSearchParams` converts them into minor units before they reach any
 * query, so no monetary maths ever happens in floating point.
 */
export function PriceRange({
  minPrice,
  maxPrice,
  idPrefix = "price",
}: {
  minPrice?: string;
  maxPrice?: string;
  idPrefix?: string;
}) {
  return (
    <div>
      <Label htmlFor={`${idPrefix}-min`}>Nightly budget (₦)</Label>
      <div className="flex items-center gap-2">
        <input
          id={`${idPrefix}-min`}
          name="minPrice"
          type="number"
          min={0}
          step={5000}
          inputMode="numeric"
          defaultValue={minPrice ?? ""}
          placeholder="Min"
          aria-label="Minimum nightly rate in naira"
          className="h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[14px] text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
        <span className="text-ink-400" aria-hidden>
          –
        </span>
        <input
          id={`${idPrefix}-max`}
          name="maxPrice"
          type="number"
          min={0}
          step={5000}
          inputMode="numeric"
          defaultValue={maxPrice ?? ""}
          placeholder="Max"
          aria-label="Maximum nightly rate in naira"
          className="h-10 w-full rounded-md border border-line-strong bg-white px-3 text-[14px] text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
      </div>
      <p className="mt-1.5 text-[12px] text-ink-500">Based on the advertised nightly rate.</p>
    </div>
  );
}

export function NumberSelect({
  name,
  label,
  defaultValue,
  from = 1,
  to = 6,
  suffix,
}: {
  name: string;
  label: string;
  defaultValue: string;
  from?: number;
  to?: number;
  suffix?: (value: number) => string;
}) {
  return (
    <div>
      <Label htmlFor={`filter-${name}`}>{label}</Label>
      <Select id={`filter-${name}`} name={name} defaultValue={defaultValue}>
        <option value="">Any</option>
        {Array.from({ length: to - from + 1 }, (_, index) => from + index).map((value) => (
          <option key={value} value={value}>
            {suffix ? suffix(value) : value}
            {!suffix ? "+" : ""}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function ToggleRow({
  name,
  label,
  hint,
  checked,
  id,
}: {
  name: string;
  label: string;
  hint?: string;
  checked: boolean;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
      <Checkbox id={id} name={name} value="true" defaultChecked={checked} className="mt-0.5" />
      <span>
        <span className="block text-[13.5px] font-medium text-ink-800">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12px] text-ink-500">{hint}</span> : null}
      </span>
    </label>
  );
}
