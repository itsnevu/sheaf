import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import DemoBanner from "@/components/site/DemoBanner";
import { ToastProvider } from "@/components/ui/Toast";
import { getSponsor } from "@/lib/auth";
import { SITE } from "@/lib/config";
import { demoStatus } from "@/lib/demo";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"], axes: ["opsz", "SOFT"], display: "swap" });
const sans = Instrument_Sans({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap", adjustFontFallback: false, fallback: ["Courier New", "ui-monospace", "monospace"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { type: "website", siteName: SITE.name, title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` }, description: SITE.description, images: ["/art/hero.webp"] },
  twitter: { card: "summary_large_image", title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` }, description: SITE.description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#F6F2E9", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [sponsor, demo] = await Promise.all([getSponsor(), demoStatus()]);
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <ToastProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
            Skip to content
          </a>
          <DemoBanner status={demo} />
          <Header wallet={sponsor?.wallet ?? null} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
