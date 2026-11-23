"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Images, Maximize2, Orbit, Play, Video, X } from "lucide-react";

import { VirtualTour } from "@/components/public/virtual-tour";
import { parseTourMeta } from "@/components/public/types";
import { cn } from "@/lib/utils";

export type PublicUnitMedia = {
  id: string;
  type: "IMAGE" | "FLOOR_PLAN" | "YOUTUBE" | "VIRTUAL_TOUR" | "VIRTUAL_TOUR_360" | "VIDEO";
  url: string;
  caption: string | null;
  meta: unknown;
};

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {
    return null;
  }
  return null;
}

/**
 * Rich per-unit media gallery for guests: photos/floor plans, videos, and
 * interactive 360° tours. Images open in a lightbox; tours render inline.
 */
export function PublicUnitMedia({ media, unitLabel }: { media: PublicUnitMedia[]; unitLabel: string }) {
  const images = useMemo(
    () => media.filter((item) => item.type === "IMAGE" || item.type === "FLOOR_PLAN"),
    [media],
  );
  const videos = useMemo(
    () => media.filter((item) => item.type === "YOUTUBE" || item.type === "VIDEO"),
    [media],
  );
  const tours = useMemo(
    () => media.filter((item) => item.type === "VIRTUAL_TOUR" || item.type === "VIRTUAL_TOUR_360"),
    [media],
  );

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const count = images.length;
  const active = images[Math.min(index, Math.max(0, count - 1))];

  const close = useCallback(() => setOpen(false), []);
  const step = useCallback(
    (dir: number) => setIndex((i) => (count === 0 ? 0 : (i + dir + count) % count)),
    [count],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, step]);

  if (images.length === 0 && videos.length === 0 && tours.length === 0) return null;

  const hero = images[0];
  const thumbs = images.slice(1, 5);
  const remaining = Math.max(0, images.length - 5);

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      {images.length > 0 ? (
        <div>
          <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setOpen(true);
              }}
              className="group relative overflow-hidden rounded-lg bg-ink-100 sm:col-span-2 sm:row-span-2"
              aria-label={`View ${unitLabel} photos`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.url}
                alt={hero.caption ?? `${unitLabel} photo`}
                className="aspect-[4/3] h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] sm:min-h-[220px]"
                loading="lazy"
              />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-ink-950/65 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                <Maximize2 className="h-3.5 w-3.5" aria-hidden /> View photos
              </span>
            </button>

            {thumbs.map((item, i) => {
              const at = i + 1;
              const isLast = i === thumbs.length - 1;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setIndex(at);
                    setOpen(true);
                  }}
                  className="group relative hidden overflow-hidden rounded-lg bg-ink-100 sm:block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.caption ?? `${unitLabel} photo`} className="aspect-[4/3] h-full w-full object-cover" loading="lazy" />
                  {isLast && remaining > 0 ? (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-ink-950/55 text-white">
                      <Images className="h-5 w-5" aria-hidden />
                      <span className="text-[13px] font-semibold">+{remaining} more</span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {images.length > 1 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 sm:hidden">
              {images.slice(1).map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setIndex(i + 1);
                    setOpen(true);
                  }}
                  className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-line"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.caption ?? `${unitLabel} photo`} className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {videos.length > 0 ? (
        <div className="space-y-2">
          {videos.map((item) => {
            const yid = item.type === "YOUTUBE" ? youtubeId(item.url) : null;
            return yid ? (
              <details key={item.id} className="overflow-hidden rounded-md border border-line bg-white">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2 text-[13px] font-semibold text-ink-800 select-none">
                  <Play className="h-4 w-4 text-brand-600" aria-hidden />
                  Watch walkthrough video{item.caption ? ` — ${item.caption}` : ""}
                </summary>
                <div className="aspect-video border-t border-line bg-black">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${yid}?rel=0`}
                    title={item.caption ?? `${unitLabel} video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </details>
            ) : (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-[13px] font-medium text-brand-700 hover:underline"
              >
                <Video className="h-4 w-4" aria-hidden />
                Watch {unitLabel} walkthrough{item.caption ? ` — ${item.caption}` : ""}
              </a>
            );
          })}
        </div>
      ) : null}

      {tours.map((item) => {
        const parsed = parseTourMeta(item.meta);
        if (!parsed) {
          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-brand-700 hover:underline"
            >
              <Orbit className="h-4 w-4" aria-hidden />
              Open virtual tour{item.caption ? ` — ${item.caption}` : ""}
            </a>
          );
        }
        return (
          <details key={item.id} className="overflow-hidden rounded-md border border-line bg-ink-50/40" open={tours.length === 1 && images.length === 0}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2 text-[13px] font-semibold text-ink-800 select-none">
              <Orbit className="h-4 w-4 text-brand-600" aria-hidden />
              360° virtual tour — {parsed.scenes.length} scene{parsed.scenes.length === 1 ? "" : "s"}
              {parsed.provider ? ` · ${parsed.provider}` : ""}
            </summary>
            <div className="border-t border-line p-3">
              <VirtualTour scenes={parsed.scenes} provider={parsed.provider} height={360} />
            </div>
          </details>
        );
      })}

      {open && active ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink-950/95" role="dialog" aria-modal="true" aria-label={`${unitLabel} photos`}>
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-white sm:px-6">
            <p className="text-[13px] font-medium">
              {unitLabel} · {index + 1} of {count}
              {active.caption ? <span className="ml-2 text-white/60">{active.caption}</span> : null}
            </p>
            <div className="flex items-center gap-1">
              {count > 1 ? (
                <>
                  <button type="button" onClick={() => step(-1)} aria-label="Previous" className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => step(1)} aria-label="Next" className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}
              <button type="button" onClick={close} aria-label="Close" className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-3 sm:px-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.url} alt={active.caption ?? `${unitLabel} photo`} className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain" />
          </div>
          {count > 1 ? (
            <div className="flex gap-2 overflow-x-auto px-4 pb-4 sm:px-6">
              {images.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "relative h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 transition-all",
                    i === index ? "ring-white" : "ring-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.caption ?? `${unitLabel} photo`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
