import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { ensureWorker } from "@/lib/worker/boot";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

const TITLE = "Sheaf";
const DESCRIPTION =
  "Batch contractor payments in digital assets: prepare, approve, coordinate and reconcile every payout from one controlled workflow. Private externally, transparent internally.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: TITLE, template: "%s · Sheaf" },
  description: DESCRIPTION,
  applicationName: "Sheaf",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  openGraph: { type: "website", siteName: "Sheaf", title: TITLE, description: DESCRIPTION, images: ["/art/og.jpg"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#f6f5f1", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  await ensureWorker();
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
