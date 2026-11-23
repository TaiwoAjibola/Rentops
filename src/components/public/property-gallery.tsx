"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, Images, Play, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { isOptimisedUrl } from "@/components/public/media";

export type GalleryItem = {
  id: string;
  kind: "image" | "video" | "youtube" | "tour";
  url: string;
  youtubeId?: string | null;
  caption?: string | null;
  label?: string;
};

/**
 * Property media gallery.
 *
 * Handles still photography, hosted video and YouTube walkthroughs, and acts as
 * the launcher for a genuinely interactive virtual tour (supplied as children by
 * the page, so a tour is only ever offered when real scene data exists).
 */
export function PropertyGallery({
  items,
  tourSlot,
  tourLabel = "Virtual tour",
  propertyName,
}: {
  items: GalleryItem[];
  tourSlot?: ReactNode;
  tourLabel?: string;
  propertyName: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const count = items.length;
  const active = items[Math.min(index, count - 1)];

  const close = useCallback(() => setOpen(false), []);
  const step = useCallback(
    (direction: number) => setIndex((current) => (current + direction + count) % count),
    [count],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, step]);

  if (count === 0 && !tourSlot) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-line-strong bg-white text-[14px] text-ink-500">
        No photography has been added to this listing yet.
      </div>
    );
  }

  const hero = items[0];
  const secondary = items.slice(1, 5);

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
        {hero ? (
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setOpen(true);
            }}
            className="group relative overflow-hidden rounded-lg bg-ink-100 sm:col-span-2 sm:row-span-2"
          >
            <span className="block aspect-[4/3] w-full sm:aspect-auto sm:h-full sm:min-h-[420px]">
              <Thumb item={hero} alt={propertyName} sizes="(max-width: 640px) 100vw, 50vw" priority />
            </span>
            <span className="absolute inset-0 bg-ink-950/0 transition-colors group-hover:bg-ink-950/10" />
          </button>
        ) : null}

        {secondary.map((item, position) => {
          const isLast = position === secondary.length - 1;
          const remaining = count - 5;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setIndex(position + 1);
                setOpen(true);
              }}
              className="group relative hidden overflow-hidden rounded-lg bg-ink-100 sm:block"
            >
              <span className="block aspect-[4/3] w-full">
                <Thumb item={item} alt={item.caption ?? propertyName} sizes="25vw" />
              </span>
              <span className="absolute inset-0 bg-ink-950/0 transition-colors group-hover:bg-ink-950/10" />
              {isLast && remaining > 0 ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-ink-950/55 text-white">
                  <Images className="h-5 w-5" aria-hidden />
                  <span className="text-[13px] font-semibold">+{remaining} more</span>
                </span>
              ) : null}
            </button>
          );
        })}

        {/* Mobile: everything after the hero in a horizontal rail */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden">
          {items.slice(1).map((item, position) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setIndex(position + 1);
                setOpen(true);
              }}
              className="relative w-32 shrink-0 overflow-hidden rounded-lg bg-ink-100"
            >
              <span className="block aspect-[4/3] w-full">
                <Thumb item={item} alt={item.caption ?? propertyName} sizes="33vw" />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-md border border-line-strong bg-white px-3.5 py-2 text-[13px] font-medium text-ink-800 transition-colors hover:bg-ink-50"
        >
          <Expand className="h-4 w-4" aria-hidden />
          View all media ({count})
        </button>

        {tourSlot ? (
          <button
            type="button"
            onClick={() => {
              setIndex(-1);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand-800"
          >
            <Play className="h-4 w-4" aria-hidden />
            {tourLabel}
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink-950/92 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${propertyName} media`}>
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-white sm:px-6">
            <p className="text-[13px] font-medium">
              {index < 0 ? tourLabel : `${Math.min(index + 1, count)} of ${count}`}
              {index >= 0 && active?.caption ? <span className="ml-2 text-white/60">{active.caption}</span> : null}
            </p>
            <div className="flex items-center gap-2">
              {index >= 0 && count > 1 ? (
                <>
                  <button type="button" onClick={() => step(-1)} aria-label="Previous" className="rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => step(1)} aria-label="Next" className="rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}
              <button type="button" onClick={close} aria-label="Close gallery" className="rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-3 sm:px-6">
            {index < 0 && tourSlot ? (
              <div className="w-full max-w-5xl overflow-hidden rounded-lg bg-white">{tourSlot}</div>
            ) : active ? (
              <Stage item={active} alt={active.caption ?? propertyName} />
            ) : null}
          </div>

          {count > 1 ? (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-4 sm:px-6">
              {items.map((item, position) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(position)}
                  className={cn(
                    "relative h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 transition-all",
                    position === index ? "ring-white" : "ring-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <Thumb item={item} alt={item.caption ?? propertyName} sizes="80px" />
                </button>
              ))}
              {tourSlot ? (
                <button
                  type="button"
                  onClick={() => setIndex(-1)}
                  className={cn(
                    "flex h-14 shrink-0 items-center gap-1.5 rounded-md border border-white/30 px-3 text-[12px] font-medium text-white transition-colors hover:bg-white/10",
                    index < 0 && "ring-2 ring-white",
                  )}
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                  Tour
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function Thumb({ item, alt, sizes, priority = false }: { item: GalleryItem; alt: string; sizes: string; priority?: boolean }) {
  if (item.kind === "youtube" && item.youtubeId) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <PlayBadge label="Video" />
      </>
    );
  }

  if (item.kind === "video") {
    return (
      <span className="absolute inset-0 flex items-center justify-center bg-ink-900">
        <PlayBadge label="Video" />
      </span>
    );
  }

  if (item.kind === "tour") {
    return (
      <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-800 to-ink-900">
        <PlayBadge label={item.label ?? "360° tour"} />
      </span>
    );
  }

  if (isOptimisedUrl(item.url)) {
    return <Image src={item.url} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={item.url} alt={alt} loading={priority ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover" />;
}

function PlayBadge({ label }: { label: string }) {
  return (
    <span className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-ink-950/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-white backdrop-blur-sm">
      <Play className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

function Stage({ item, alt }: { item: GalleryItem; alt: string }) {
  if (item.kind === "youtube" && item.youtubeId) {
    return (
      <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-lg bg-black">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${item.youtubeId}?rel=0`}
          title={alt}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (item.kind === "video") {
    return (
      <div className="w-full max-w-5xl overflow-hidden rounded-lg bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={item.url} controls playsInline className="mx-auto max-h-[75vh] w-full" />
      </div>
    );
  }

  // Lightbox size is viewport-driven, so a plain img avoids arbitrary width
  // bookkeeping while still using the optimised loader where it is available.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={item.url} alt={alt} className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain" />;
}
