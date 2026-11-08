import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Barlow, Barlow_Condensed, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { ensureWorker } from "@/lib/worker/boot";

const sans = Barlow({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["200", "300"], display: "swap" });
const serif = Playfair_Display({ variable: "--font-serif", subsets: ["latin"], weight: ["400"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

const TITLE = "Rheo";
const DESCRIPTION =
  "Token vesting and streaming protocol on Elysium L2. Linear streams with cliff, batch create, 25 bps fee, fully on-chain.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: TITLE, template: "%s · Rheo" },
  description: DESCRIPTION,
  applicationName: "Rheo",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  openGraph: { type: "website", siteName: "Rheo", title: TITLE, description: DESCRIPTION, images: ["/art/og.jpg"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "rgb(0, 64, 255)", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  await ensureWorker();
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable} ${serif.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
