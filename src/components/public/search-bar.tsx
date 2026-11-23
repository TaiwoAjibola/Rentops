"use client";

import { useEffect, useState } from "react";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { StayPresets } from "@/components/public/stay-presets";
import { addDays, toISODate, toUtcDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type SearchBarCategory = { slug: string; name: string };

export type SearchBarDefaults = {
  q?: string;
  category?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  rooms?: string;
  maxPrice?: string;
};

/**
 * The RentOps search interface.
 *
 * It is a plain GET form pointing at `/search`, so every search is a real,
 * shareable URL and the whole thing works before (or without) JavaScript. The
 * client-side parts only ever *help*: stay presets fill the date fields, and
 * check-out is nudged forward when the check-in date moves past it.
 */
export function SearchBar({
  categories,
  defaults = {},
  variant = "hero",
  action = "/search",
  className,
}: {
  categories: SearchBarCategory[];
  defaults?: SearchBarDefaults;
  variant?: "hero" | "compact";
  action?: string;
  className?: string;
}) {
  const [checkIn, setCheckIn] = useState(defaults.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(defaults.checkOut ?? "");
  const [preset, setPreset] = useState<number | null>(null);
  const [today, setToday] = useState("");

  // Only known once mounted — keeps server and client markup identical.
  useEffect(() => setToday(toISODate(toUtcDate(new Date()))), []);

  function applyPreset(nights: number) {
    const base = checkIn || today || toISODate(toUtcDate(new Date()));
    setCheckIn(base);
    setCheckOut(toISODate(addDays(toUtcDate(base), nights)));
    setPreset(nights);
  }

  const compact = variant === "compact";

  if (compact) {
    return (
      <form
        action={action}
        method="get"
        className={cn("flex w-full items-center gap-2 rounded-lg border border-line bg-white p-1.5 shadow-xs", className)}
      >
        <div className="relative flex min-w-0 flex-1 items-center">
          <MapPin className="pointer-events-none absolute left-3 h-4 w-4 text-ink-400" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={defaults.q ?? ""}
            placeholder="City, area or property"
            aria-label="Destination"
            className="h-9 w-full rounded-md pl-9 pr-3 text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
        <select
          name="category"
          defaultValue={defaults.category ?? ""}
          aria-label="Property type"
          className="hidden h-9 max-w-[160px] rounded-md border border-line bg-white px-2 text-[13px] text-ink-700 sm:block"
        >
          <option value="">Any type</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        <input type="date" name="checkIn" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} aria-label="Check-in" className="hidden h-9 rounded-md border border-line px-2 text-[13px] lg:block" />
        <input type="date" name="checkOut" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} aria-label="Check-out" className="hidden h-9 rounded-md border border-line px-2 text-[13px] lg:block" />
        <input type="hidden" name="guests" value={defaults.guests ?? "1"} />
        <Button type="submit" size="sm" className="shrink-0">
          <Search className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Search</span>
        </Button>
      </form>
    );
  }

  return (
    <form
      action={action}
      method="get"
      className={cn("rounded-xl border border-line bg-white p-5 shadow-lg sm:p-6", className)}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="search-q">Where are you going?</Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              id="search-q"
              name="q"
              type="text"
              defaultValue={defaults.q ?? ""}
              placeholder="Lagos, Abuja, Lekki Phase 1, Port Harcourt…"
              autoComplete="off"
              className="h-11 w-full rounded-md border border-line-strong bg-white pl-10 pr-3.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="search-category">Property type</Label>
          <Select id="search-category" name="category" defaultValue={defaults.category ?? ""}>
            <option value="">Any type of accommodation</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-ink-700">How long do you need it for?</p>
          <button
            type="button"
            onClick={() => {
              setPreset(null);
              setCheckIn("");
              setCheckOut("");
            }}
            className={cn("text-[13px] text-ink-500 underline-offset-4 hover:text-brand-700 hover:underline", !checkIn && !checkOut ? "hidden" : "")}
          >
            Clear dates
          </button>
        </div>
        <StayPresets active={preset} onSelect={applyPreset} className="mt-2.5" />
      </div>

      <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.1fr_0.8fr_0.7fr_1fr_auto]">
        <div>
          <Label htmlFor="search-check-in">Check in</Label>
          <input
            id="search-check-in"
            name="checkIn"
            type="date"
            min={today || undefined}
            value={checkIn}
            onChange={(event) => {
              setCheckIn(event.target.value);
              setPreset(null);
              if (checkOut && event.target.value >= checkOut) {
                setCheckOut(toISODate(addDays(toUtcDate(event.target.value), 1)));
              }
            }}
            className="h-11 w-full rounded-md border border-line-strong bg-white px-3.5 text-[15px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>

        <div>
          <Label htmlFor="search-check-out">Check out</Label>
          <input
            id="search-check-out"
            name="checkOut"
            type="date"
            min={checkIn || today || undefined}
            value={checkOut}
            onChange={(event) => {
              setCheckOut(event.target.value);
              setPreset(null);
            }}
            className="h-11 w-full rounded-md border border-line-strong bg-white px-3.5 text-[15px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>

        <div>
          <Label htmlFor="search-guests">Guests</Label>
          <Select id="search-guests" name="guests" defaultValue={defaults.guests ?? "1"}>
            {Array.from({ length: 16 }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "guest" : "guests"}
              </option>
            ))}
            <option value="20">20+ guests</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="search-rooms">Rooms</Label>
          <Select id="search-rooms" name="rooms" defaultValue={defaults.rooms ?? "1"}>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="search-max-price">Budget ceiling</Label>
          <input
            id="search-max-price"
            name="maxPrice"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            defaultValue={defaults.maxPrice ?? ""}
            placeholder="250000"
            className="h-11 w-full rounded-md border border-line-strong bg-white px-3.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
          <p className="mt-1.5 text-[12px] text-ink-500">Maximum nightly rate in naira</p>
        </div>

        <Button type="submit" size="lg" className="self-start lg:mt-[26px]">
          <Search className="h-4 w-4" aria-hidden />
          Search stays
        </Button>
      </div>

      <p className="mt-4 flex items-center gap-2 text-[12.5px] text-ink-500">
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
        Looking for something specific? Narrow by amenities, rating and availability on the results page.
      </p>
    </form>
  );
}
