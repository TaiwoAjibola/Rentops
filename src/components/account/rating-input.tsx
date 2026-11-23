"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

const HINTS = ["Poor", "Below average", "Okay", "Very good", "Excellent"];

/** Accessible 1–5 star rating: real radio inputs behind the visual stars. */
export function StarRatingInput({
  name,
  label,
  required = false,
  size = "md",
}: {
  name: string;
  label: string;
  required?: boolean;
  size?: "sm" | "md";
}) {
  const [value, setValue] = useState(0);
  const id = useId();
  const starSize = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <fieldset className="w-full">
      <legend className="mb-1.5 block text-[13px] font-medium text-ink-700">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </legend>

      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((score) => (
          <label
            key={score}
            htmlFor={`${id}-${score}`}
            className="cursor-pointer rounded p-0.5 transition-transform hover:scale-110"
          >
            <input
              id={`${id}-${score}`}
              type="radio"
              name={name}
              value={score}
              required={required && score === 1}
              checked={value === score}
              onChange={() => setValue(score)}
              className="peer sr-only"
            />
            <Star
              className={cn(
                starSize,
                "transition-colors",
                value >= score ? "fill-gold-400 text-gold-400" : "text-line-strong",
              )}
              aria-hidden
            />
            <span className="sr-only">{`${score} out of 5 — ${HINTS[score - 1] ?? ""}`}</span>
          </label>
        ))}
        <span className="ml-2 text-[13px] text-ink-500" aria-live="polite">
          {value > 0 ? HINTS[value - 1] : "Not rated"}
        </span>
      </div>
    </fieldset>
  );
}
