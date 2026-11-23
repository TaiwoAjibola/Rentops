/**
 * Query-string helpers for the discovery pages.
 *
 * Every filter, sort and page change on RentOps is a plain GET navigation, so
 * filter state is shareable, bookmarkable and works without JavaScript. These
 * helpers always preserve the parameters already in play.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Parameters that stop making sense once the result set changes. */
const RESET_ON_FILTER_CHANGE = ["page"];

function toEntries(current: RawSearchParams): [string, string][] {
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(current)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) entries.push([key, item]);
    } else {
      entries.push([key, value]);
    }
  }
  return entries;
}

/**
 * Merges changes into the current query string.
 * `null`, `undefined` and `""` remove the key.
 */
export function buildQueryString(
  current: RawSearchParams,
  changes: Record<string, string | number | boolean | readonly string[] | null | undefined> = {},
) {
  const usp = new URLSearchParams();
  for (const [key, value] of toEntries(current)) usp.append(key, value);

  const remove = [...RESET_ON_FILTER_CHANGE, ...Object.keys(changes)];
  for (const key of remove) usp.delete(key);

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      for (const entry of value) usp.append(key, entry);
      continue;
    }
    usp.append(key, String(value));
  }

  const query = usp.toString();
  return query ? `?${query}` : "";
}

export function hrefWith(
  basePath: string,
  current: RawSearchParams,
  changes: Record<string, string | number | boolean | null | undefined> = {},
) {
  return `${basePath}${buildQueryString(current, changes)}`;
}

export function currentAmenities(current: RawSearchParams): string[] {
  const value = current["amenities"];
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function hasFilters(params: RawSearchParams) {
  const keys = ["q", "category", "checkIn", "checkOut", "guests", "rooms", "bedrooms", "bathrooms", "minPrice", "maxPrice", "amenities", "rating", "instant", "verified"];
  const entries = toEntries(params);
  return entries.some(([key, value]) => keys.includes(key) && value !== "" && !(key === "guests" && value === "1"));
}

export function toNumber(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function firstValue(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? "";
}
