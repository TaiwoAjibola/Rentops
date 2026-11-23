import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold" | "inverse";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-sm disabled:bg-brand-300",
  secondary:
    "bg-brand-50 text-brand-800 hover:bg-brand-100 active:bg-brand-200 disabled:text-brand-300",
  outline:
    "border border-line-strong bg-white text-ink-800 hover:bg-ink-50 hover:border-ink-300 disabled:text-ink-400",
  ghost: "text-ink-700 hover:bg-ink-100 disabled:text-ink-400",
  danger: "bg-danger text-white hover:brightness-95 active:brightness-90 shadow-sm",
  gold: "bg-gold-500 text-white hover:bg-gold-600 shadow-sm",
  inverse: "bg-white text-brand-800 hover:bg-brand-50 shadow-sm",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-md",
  md: "h-11 px-5 text-sm gap-2 rounded-md",
  lg: "h-13 px-7 text-[15px] gap-2.5 rounded-lg",
  icon: "h-10 w-10 rounded-md",
};

export function buttonClass(options?: { variant?: Variant; size?: Size; className?: string }) {
  return cn(
    "inline-flex items-center justify-center font-medium tracking-[-0.01em] transition-all duration-200",
    "disabled:cursor-not-allowed disabled:opacity-70 select-none",
    VARIANTS[options?.variant ?? "primary"],
    SIZES[options?.size ?? "md"],
    options?.className,
  );
}

export type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}

export type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}

export type IconButtonProps = ComponentProps<"button"> & { label: string; variant?: Variant };

export function IconButton({ label, variant = "ghost", className, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(buttonClass({ variant, size: "icon", className }), "shrink-0")}
      {...props}
    />
  );
}
