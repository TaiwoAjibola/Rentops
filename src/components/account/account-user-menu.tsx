"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Settings } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type AccountUserMenuUser = {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
};

export function AccountUserMenu({
  user,
  signOut,
}: {
  user: AccountUserMenuUser;
  signOut: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const name = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${name}`}
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-2 transition-colors hover:border-line-strong"
      >
        <Avatar name={name} src={user.avatarUrl} size="sm" />
        <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-ink-800 sm:block">
          {user.firstName}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-ink-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-lg border border-line bg-white shadow-lg"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-[14px] font-semibold text-ink-900">{name}</p>
            <p className="truncate text-[12px] text-ink-500">{user.email}</p>
          </div>
          <div className="p-1.5">
            <Link
              href="/account/profile"
              role="menuitem"
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[14px] text-ink-700 transition-colors hover:bg-ink-50"
            >
              <Settings className="h-4 w-4 text-ink-400" aria-hidden />
              Profile & settings
            </Link>
            <div className="mt-1 border-t border-line pt-1">{signOut}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
