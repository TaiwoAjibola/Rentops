"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, GripHorizontal, MoveHorizontal, RotateCcw, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TourScene } from "@/components/public/types";

/**
 * Interactive room-to-room virtual tour.
 *
 * Renders only for media rows whose `meta` genuinely contains scenes. There is
 * no third-party viewer: the panorama is a wide equirectangular image laid out
 * twice side by side and translated horizontally, which gives continuous 360°
 * panning and seamless wrap-around using CSS transforms alone.
 *
 * A walkthrough video is never presented here — the page only mounts this
 * component when scene data exists.
 */

const FIELD_OF_VIEW = 90; // degrees approximated across the viewport width

function normaliseDelta(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

function signedDelta(from: number, to: number) {
  return (((to - from) % 360) + 540) % 360 - 180;
}

export function VirtualTour({
  scenes,
  provider,
  initialSceneId,
  height = 460,
  className,
}: {
  scenes: TourScene[];
  provider?: string | null;
  initialSceneId?: string;
  height?: number;
  className?: string;
}) {
  const [sceneId, setSceneId] = useState(initialSceneId ?? scenes[0]?.id ?? "");
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [imageWidth, setImageWidth] = useState(0);
  const [dragging, setDragging] = useState(false);

  const viewport = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  const scene = scenes.find((entry) => entry.id === sceneId) ?? scenes[0];

  useEffect(() => {
    if (!scene) return;
    setYaw(0);
    setPitch(0);
  }, [scene?.id, scene]);

  useEffect(() => {
    const measure = () => {
      const node = image.current;
      if (node) setImageWidth(node.getBoundingClientRect().width);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [scene?.panorama]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    setDragging(true);
    dragStart.current = { x: event.clientX, y: event.clientY, yaw, pitch };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !dragStart.current) return;
    const width = viewport.current?.clientWidth ?? 1;
    const deltaX = ((event.clientX - dragStart.current.x) / width) * FIELD_OF_VIEW;
    const deltaY = ((event.clientY - dragStart.current.y) / height) * FIELD_OF_VIEW * 0.5;
    setYaw(normaliseDelta(dragStart.current.yaw - deltaX));
    setPitch(Math.max(-18, Math.min(18, dragStart.current.pitch + deltaY)));
  }

  function endDrag() {
    setDragging(false);
    dragStart.current = null;
  }

  if (!scene) return null;

  const offset = imageWidth > 0 ? (yaw / 360) * imageWidth : 0;
  const verticalOffset = (pitch / 90) * height * 0.35;

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-ink-950", className)}>
      <div
        ref={viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn("relative w-full select-none overflow-hidden", dragging ? "cursor-grabbing" : "cursor-grab")}
        style={{ height, touchAction: "none" }}
        role="application"
        aria-label={`360 degree tour — ${scene.name}`}
      >
        <div
          className="absolute inset-0 flex"
          style={{
            transform: `translate3d(${-offset}px, ${-verticalOffset}px, 0)`,
            willChange: "transform",
          }}
        >
          {/* Two copies give continuous wrap-around with no visible seam. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={image}
            src={scene.panorama}
            alt={`${scene.name} panorama`}
            draggable={false}
            className="block h-full w-auto max-w-none min-w-full object-cover"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={scene.panorama}
            alt=""
            aria-hidden
            draggable={false}
            className="block h-full w-auto max-w-none object-cover"
          />
        </div>

        {scene.hotspots.map((hotspot) => {
          const delta = signedDelta(yaw, hotspot.yaw);
          if (Math.abs(delta) > FIELD_OF_VIEW / 2) return null;
          const left = 50 + (delta / FIELD_OF_VIEW) * 100;
          const top = 50 - (hotspot.pitch / FIELD_OF_VIEW) * 100;
          const target = scenes.find((entry) => entry.id === hotspot.to);
          if (!target) return null;

          return (
            <button
              key={`${hotspot.to}-${hotspot.yaw}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSceneId(target.id);
              }}
              className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-ink-950/45 p-2 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-brand-700"
              style={{ left: `${left}%`, top: `${top}%` }}
              title={hotspot.label || `Go to ${target.name}`}
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
              <span className="sr-only">{hotspot.label || `Go to ${target.name}`}</span>
              <span className="pointer-events-none absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-950/90 px-2 py-1 text-[11px] font-medium text-white group-hover:block">
                {hotspot.label || target.name}
              </span>
            </button>
          );
        })}

        <div className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-ink-950/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <MoveHorizontal className="h-3 w-3" aria-hidden />
          Drag to look around
        </div>

        <button
          type="button"
          onClick={() => {
            setYaw(0);
            setPitch(0);
          }}
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-ink-950/55 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-ink-950/80"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          Reset view
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-ink-900 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <GripHorizontal className="h-4 w-4 text-white/50" aria-hidden />
          <span className="text-[13px] font-medium">{scene.name}</span>
          <span className="text-[12px] text-white/50">
            {scenes.findIndex((entry) => entry.id === scene.id) + 1} / {scenes.length}
          </span>
        </div>

        <div className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto">
          {scenes.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSceneId(entry.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                entry.id === scene.id
                  ? "bg-white text-ink-900"
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white",
              )}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </div>

      {provider ? (
        <p className="flex items-center gap-1.5 bg-ink-950 px-4 pb-3 text-[11px] text-white/40">
          <Sparkles className="h-3 w-3" aria-hidden />
          Interactive tour{provider ? ` · ${provider}` : ""} · {scenes.length} scene{scenes.length === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}
