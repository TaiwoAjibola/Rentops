import { Quote } from "lucide-react";

import { Avatar, Rating } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/data";
import { cn } from "@/lib/utils";

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  context: string;
  rating: number;
};

/**
 * Guest testimonials.
 *
 * Sourced from published reviews attached to real reservations — RentOps does
 * not invent quotes, so when there is nothing published yet the section says so.
 */
export function Testimonials({
  testimonials,
  className,
}: {
  testimonials: Testimonial[];
  className?: string;
}) {
  if (testimonials.length === 0) {
    return (
      <EmptyState
        icon={<Quote className="h-5 w-5" />}
        title="No published guest reviews yet"
        description="Every review on RentOps is written by someone who completed a stay. Check back soon."
        className={className}
      />
    );
  }

  return (
    <ul className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {testimonials.map((testimonial) => (
        <li
          key={testimonial.id}
          className="flex flex-col rounded-lg border border-line bg-white p-6 shadow-xs"
        >
          <Quote className="h-5 w-5 text-brand-300" aria-hidden />
          <blockquote className="mt-3 flex-1 text-[14.5px] leading-relaxed text-ink-700">
            {testimonial.quote}
          </blockquote>
          <Rating value={testimonial.rating} size="xs" className="mt-4" showValue={false} />
          <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
            <Avatar name={testimonial.author} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-ink-900">{testimonial.author}</p>
              <p className="truncate text-[12.5px] text-ink-500">{testimonial.context}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
