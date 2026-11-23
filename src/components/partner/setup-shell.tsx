import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";

/**
 * Chrome for partner routes that intentionally sit OUTSIDE the guarded portal
 * (registration, invitation acceptance) — they must work for users who have no
 * membership yet.
 */
export function SetupShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8 text-brand-700" />
            <span className="font-display text-[18px] font-semibold text-ink-900">RentOps partners</span>
          </Link>
          <Link href="/partner" className="text-[13px] font-medium text-brand-700 hover:underline">
            Already a partner? Sign in
          </Link>
        </div>
      </header>

      <main className="container-page py-10 sm:py-14">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>

      {footer ? (
        <footer className="border-t border-line bg-white py-8">
          <div className="container-page text-[13px] text-ink-500">{footer}</div>
        </footer>
      ) : null}
    </div>
  );
}
