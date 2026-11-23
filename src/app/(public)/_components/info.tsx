import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Typography and layout primitives for the informational public pages.
 *
 * These exist locally (rather than in `src/components/ui`) because they are only
 * used by the public content routes: help, about, legal, trust & safety,
 * partners and company pages.
 */

/** Long-form prose with sane defaults for headings, lists and inline links. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-[15px] leading-relaxed text-ink-700",
        "[&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-2",
        "[&_h3]:mt-7 [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:text-ink-900",
        "[&_ol]:mt-3.5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5",
        "[&_p]:mt-3.5",
        "[&_strong]:font-semibold [&_strong]:text-ink-900",
        "[&_ul]:mt-3.5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type ArticleSection = {
  id: string;
  title: string;
  body: ReactNode;
};

/**
 * Long document layout: sticky contents on large screens, numbered sections in
 * the reading column. Every section is addressable, so support can link
 * directly to a clause.
 */
export function InfoArticle({
  sections,
  intro,
  updated,
  footer,
}: {
  sections: ArticleSection[];
  intro?: ReactNode;
  updated?: string;
  footer?: ReactNode;
}) {
  return (
    <div className="container-page mt-14 grid gap-12 lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <nav aria-label="On this page">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            On this page
          </p>
          <ol className="mt-4 space-y-2 border-l border-line pl-4">
            {sections.map((section, index) => (
              <li key={section.id}>
                <Link
                  href={`#${section.id}`}
                  className="flex gap-2 text-[13.5px] leading-snug text-ink-600 transition-colors hover:text-brand-700"
                >
                  <span className="tabular-nums text-ink-400">{index + 1}.</span>
                  {section.title}
                </Link>
              </li>
            ))}
          </ol>
          {updated ? <p className="mt-6 text-[12.5px] text-ink-500">Last updated {updated}</p> : null}
        </nav>
      </aside>

      <article className="min-w-0 max-w-3xl pb-8">
        {intro ? <Prose>{intro}</Prose> : null}

        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className="mt-12 scroll-mt-24 first:mt-10">
            <h2 className="flex gap-3 font-display text-[22px] leading-snug text-ink-900">
              <span className="text-brand-600">{index + 1}.</span>
              {section.title}
            </h2>
            <Prose className="mt-3">{section.body}</Prose>
          </section>
        ))}

        {footer ? <div className="mt-12">{footer}</div> : null}
      </article>
    </div>
  );
}

/** Numbered process steps — used for onboarding, booking and dispute flows. */
export function NumberedSteps({
  steps,
  className,
}: {
  steps: { title: string; body: string }[];
  className?: string;
}) {
  return (
    <ol className={cn("grid gap-5 sm:grid-cols-2", className)}>
      {steps.map((step, index) => (
        <li key={step.title} className="rounded-lg border border-line bg-white p-5 shadow-xs">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-[13px] font-semibold text-brand-700">
            {index + 1}
          </span>
          <h3 className="mt-4 text-[15px] font-semibold text-ink-900">{step.title}</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

/** Native disclosure list — works without JavaScript and stays keyboard usable. */
export function Faq({
  items,
  className,
}: {
  items: { question: string; answer: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-line overflow-hidden rounded-lg border border-line bg-white", className)}>
      {items.map((item) => (
        <details key={item.question} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15px] font-semibold text-ink-900 marker:hidden">
            {item.question}
            <ChevronDown
              className="mt-0.5 h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <Prose className="mt-2.5 [&_p:first-child]:mt-0">{item.answer}</Prose>
        </details>
      ))}
    </div>
  );
}
