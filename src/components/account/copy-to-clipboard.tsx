"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyToClipboard({
  value,
  label = "Copy link",
  className,
  variant = "outline",
  size = "sm",
}: {
  value: string;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold" | "inverse";
  size?: "sm" | "md" | "lg";
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          // Clipboard access can be blocked; the raw value is shown alongside.
          setCopied(false);
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? "Copied" : label}
    </Button>
  );
}
