import Image from "next/image";
import { Building2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Image rendering for the public site.
 *
 * `next/image` only accepts hosts whitelisted in `next.config.mjs`
 * (Cloudinary, Unsplash) plus local paths. Anything else — for example a partner
 * hosting a cover photo on their own domain — falls back to a plain `img` so a
 * listing never breaks because of the image host.
 */

const OPTIMISED_HOSTS = ["res.cloudinary.com", "images.unsplash.com", "plus.unsplash.com"];

export function isOptimisedUrl(url?: string | null): url is string {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  try {
    const host = new URL(url).hostname;
    return OPTIMISED_HOSTS.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
  } catch {
    return false;
  }
}

export function SmartImage({
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
  className,
  priority = false,
}: {
  src?: string | null;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  if (!src) return <ImagePlaceholder className={className} />;

  if (isOptimisedUrl(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover transition-transform duration-500", className)}
      />
    );
  }

  // Host is outside the configured remote patterns — optimisation is not
  // possible, so we render the asset directly rather than failing the page.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}

export function ImagePlaceholder({ className, label }: { className?: string; label?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-100 via-brand-50 to-ink-100 text-brand-700",
        className,
      )}
    >
      <Building2 className="h-7 w-7 opacity-70" aria-hidden />
      {label ? <span className="text-[11px] font-medium uppercase tracking-[0.1em] opacity-70">{label}</span> : null}
    </div>
  );
}
