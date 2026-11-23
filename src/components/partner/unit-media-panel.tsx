"use client";

import { ChevronDown, ImageIcon, Trash2, Video, Orbit } from "lucide-react";

import { ActionForm } from "@/components/partner/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { addUnitImages, addUnitYoutube, saveUnitVirtualTour, deleteUnitMedia } from "@/server/actions/partner-unit-media";
import { parseTourMeta } from "@/components/public/types";

export type UnitMediaItem = {
  id: string;
  type: "IMAGE" | "FLOOR_PLAN" | "YOUTUBE" | "VIRTUAL_TOUR" | "VIRTUAL_TOUR_360" | "VIDEO";
  url: string;
  caption: string | null;
  meta: unknown;
};

/**
 * Per-unit media workspace — photos of this exact room, its floor plan,
 * a walkthrough video and an interactive 360° tour. The guest sees all of
 * this on the public property page before booking.
 */
export function UnitMediaPanel({
  unitId,
  media,
}: {
  unitId: string;
  media: UnitMediaItem[];
}) {
  const images = media.filter((item) => item.type === "IMAGE" || item.type === "FLOOR_PLAN");
  const videos = media.filter((item) => item.type === "YOUTUBE" || item.type === "VIDEO");
  const tours = media.filter((item) => item.type === "VIRTUAL_TOUR" || item.type === "VIRTUAL_TOUR_360");

  return (
    <details className="mt-3 rounded-md border border-line bg-ink-50/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[13px] font-semibold text-ink-800 select-none">
        <span className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-ink-400" aria-hidden />
          Media {media.length > 0 ? `(${media.length})` : "— add photos, a tour"}
        </span>
        <ChevronDown className="h-4 w-4 text-ink-400" aria-hidden />
      </summary>

      <div className="space-y-4 border-t border-line p-3">
        {/* Existing media */}
        {images.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {images.map((item) => (
              <div key={item.id} className="group relative overflow-hidden rounded-md border border-line bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.caption ?? "Unit photo"}
                  className="h-20 w-28 object-cover"
                  loading="lazy"
                />
                {item.type === "FLOOR_PLAN" ? (
                  <span className="absolute bottom-1 left-1 rounded bg-ink-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    FLOOR PLAN
                  </span>
                ) : null}
                <ActionForm
                  action={deleteUnitMedia}
                  hidden={{ unitId, mediaId: item.id }}
                  submitLabel="Remove"
                  submitVariant="ghost"
                  submitSize="sm"
                  showStatus={false}
                  submitClassName="absolute right-1 top-1 h-7 rounded border border-white/60 bg-ink-900/70 px-1.5 text-[10px] font-medium text-white hover:bg-danger"
                />
              </div>
            ))}
          </div>
        ) : null}

        {videos.length > 0 ? (
          <ul className="space-y-1.5">
            {videos.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:underline"
                >
                  <Video className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.caption ?? "Walkthrough video"}</span>
                </a>
                <ActionForm
                  action={deleteUnitMedia}
                  hidden={{ unitId, mediaId: item.id }}
                  submitLabel="Remove"
                  submitVariant="ghost"
                  submitSize="sm"
                  showStatus={false}
                />
              </li>
            ))}
          </ul>
        ) : null}

        {tours.length > 0 ? (
          <ul className="space-y-1.5">
            {tours.map((item) => {
              const parsed = parseTourMeta(item.meta);
              return (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-ink-800">
                    <Orbit className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                    <span className="truncate">
                      {item.caption ?? "Virtual tour"}
                      {parsed ? ` · ${parsed.scenes.length} scenes` : " · external tour"}
                    </span>
                  </span>
                  <ActionForm
                    action={deleteUnitMedia}
                    hidden={{ unitId, mediaId: item.id }}
                    submitLabel="Remove"
                    submitVariant="ghost"
                    submitSize="sm"
                    showStatus={false}
                  />
                </li>
              );
            })}
          </ul>
        ) : null}

        {/* Upload images / floor plans */}
        <ActionForm
          action={addUnitImages}
          hidden={{ unitId }}
          submitLabel="Upload photos"
          submitVariant="outline"
          submitSize="sm"
          className="grid gap-2"
        >
          <Field label="Media type" htmlFor={`unit-media-kind-${unitId}`}>
            <Select id={`unit-media-kind-${unitId}`} name="kind" defaultValue="IMAGE">
              <option value="IMAGE">Photo</option>
              <option value="FLOOR_PLAN">Floor plan</option>
            </Select>
          </Field>
          <input
            id={`unit-media-files-${unitId}`}
            name="files"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
            className="block w-full text-[13px] text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-white hover:file:bg-brand-800"
          />
        </ActionForm>

        {/* YouTube walkthrough */}
        <ActionForm action={addUnitYoutube} hidden={{ unitId }} submitLabel="Add video link" submitVariant="outline" submitSize="sm" className="grid gap-2">
          <Field label="YouTube walkthrough" htmlFor={`unit-youtube-${unitId}`}>
            <Input id={`unit-youtube-${unitId}`} name="youtubeUrl" type="url" placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
        </ActionForm>

        {/* Interactive 360 tour */}
        <ActionForm action={saveUnitVirtualTour} hidden={{ unitId }} submitLabel="Save 360° tour" submitVariant="outline" submitSize="sm" className="grid gap-2">
          <Field
            label="360° tour"
            htmlFor={`unit-tour-${unitId}`}
            hint="Paste the tour manifest JSON (Matterport / Kuula), or upload it."
          >
            <Textarea id={`unit-tour-${unitId}`} name="tourJson" rows={2} placeholder='{"provider":"kuula","scenes":[…]}' />
          </Field>
          <input id={`unit-tour-file-${unitId}`} name="tourFile" type="file" accept="application/json" className="block w-full text-[12px] text-ink-500" />
        </ActionForm>
      </div>
    </details>
  );
}
