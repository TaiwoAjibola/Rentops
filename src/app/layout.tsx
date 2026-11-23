import type { Metadata } from "next";
import { Cinzel, Fraunces, Montserrat } from "next/font/google";

import "./globals.css";
import { SITE } from "@/lib/constants";

// Body: Montserrat (geometric, highly legible at small sizes).
const sans = Montserrat({
  subsets: ["latin"],
  variable: "--font-rentops-sans",
  display: "swap",
});

// Headings: Fraunces (warm editorial serif).
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-rentops-display",
  display: "swap",
});

// Brand wordmark: Cinzel (classic capitals — luxury short-let feel).
const brand = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rentops-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — Find, book and lease accommodation in Nigeria`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    title: `${SITE.name} — Find, book and lease accommodation in Nigeria`,
    description: SITE.description,
    siteName: SITE.name,
    locale: "en_NG",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
  lang="en"
  data-scroll-behavior="smooth"
  className={`${sans.variable} ${display.variable} ${brand.variable}`}
>
      <body className="min-h-screen bg-canvas antialiased">{children}</body>
    </html>
  );
}
