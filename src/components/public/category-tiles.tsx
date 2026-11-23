import Link from "next/link";
import {
  BedDouble,
  Building2,
  Castle,
  Home,
  Hotel,
  KeyRound,
  Landmark,
  Tent,
  TreePalm,
  Warehouse,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SmartImage } from "@/components/public/media";
import type { CategoryTile as CategoryTileData } from "@/components/public/types";
import { cn } from "@/lib/utils";

const ICONS: LucideIcon[] = [Hotel, Home, Building2, BedDouble, Waves, KeyRound, Tent, Castle, Landmark, Warehouse, TreePalm];

/** Clickable property-type tiles, each linking to that category's results. */
export function CategoryTiles({
  categories,
  layout = "rail",
  withImagery = false,
  className,
}: {
  categories: CategoryTileData[];
  layout?: "rail" | "grid";
  withImagery?: boolean;
  className?: string;
}) {
  if (categories.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong px-5 py-10 text-center text-[14px] text-ink-500">
        Property categories have not been set up yet.
      </p>
    );
  }

  return (
    <ul
      className={cn(
        layout === "rail"
          ? "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
          : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {categories.map((category, index) => {
        const Icon = ICONS[index % ICONS.length] ?? Building2;
        return (
          <li
            key={category.id}
            className={cn(
              "snap-start",
              layout === "rail" ? "w-[210px] shrink-0 sm:w-[230px]" : "",
            )}
          >
            <Link
              href={`/categories/${category.slug}`}
              className={cn(
                "group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md",
                layout === "grid" && withImagery ? "pb-0" : "",
              )}
            >
              {withImagery ? (
                <span className="relative block aspect-[16/10] w-full overflow-hidden bg-ink-100">
                  <SmartImage
                    src={category.imageUrl}
                    alt={category.name}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="group-hover:scale-[1.03]"
                  />
                </span>
              ) : null}

              <span className="flex flex-1 flex-col p-4">
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-md",
                    withImagery ? "bg-brand-50 text-brand-700" : "bg-ink-50 text-ink-700 group-hover:bg-brand-50 group-hover:text-brand-700",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-3 block text-[14.5px] font-semibold text-ink-900 group-hover:text-brand-800">
                  {category.name}
                </span>
                <span className="mt-1 block text-[12.5px] text-ink-500">
                  {category.count === 0
                    ? "No stays listed yet"
                    : `${category.count} ${category.count === 1 ? "stay" : "stays"}`}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
