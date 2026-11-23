"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Find a stay" },
  { href: "/categories", label: "Categories" },
  { href: "/destinations", label: "Destinations" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/partners", label: "List your property" },
];

export function MobileNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-700 transition-colors hover:bg-ink-100"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div
        className={cn(
          "fixed inset-x-0 top-[65px] z-40 origin-top border-b border-line bg-white px-4 pb-6 pt-4 shadow-lg transition-all duration-200",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <nav className="flex flex-col">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-line py-3 text-[15px] font-medium text-ink-800"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-5 flex flex-col gap-2.5">
          {isAuthenticated ? (
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-md bg-brand-700 px-5 text-sm font-medium text-white"
            >
              My account
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-md border border-line-strong px-5 text-sm font-medium text-ink-800"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-md bg-brand-700 px-5 text-sm font-medium text-white"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function MobileBrand() {
  return (
    <Link href="/" className="md:hidden">
      <Logo />
    </Link>
  );
}
