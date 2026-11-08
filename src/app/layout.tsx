import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/Providers";
import { ensureWorker } from "@/lib/worker/boot";

const sans = localFont({ variable: "--font-sans", src: [
  { path: "../../public/fonts/barlow-400.woff2", weight: "400" },
  { path: "../../public/fonts/barlow-500.woff2", weight: "500" },
  { path: "../../public/fonts/barlow-600.woff2", weight: "600" },
  { path: "../../public/fonts/barlow-700.woff2", weight: "700" },
], display: "swap" });
const display = localFont({ variable: "--font-display", src: [
  { path: "../../public/fonts/barlow-condensed-200.woff2", weight: "200" },
  { path: "../../public/fonts/barlow-condensed-300.woff2", weight: "300" },
], display: "swap" });
const serif = localFont({ variable: "--font-serif", src: "../../public/fonts/playfair-display-400.woff2", weight: "400", display: "swap" });
const mono = localFont({ variable: "--font-mono", src: [
  { path: "../../public/fonts/jetbrains-mono-400.woff2", weight: "400" },
  { path: "../../public/fonts/jetbrains-mono-500.woff2", weight: "500" },
  { path: "../../public/fonts/jetbrains-mono-700.woff2", weight: "700" },
], display: "swap" });

const TITLE = "Raqio";
const DESCRIPTION =
  "Token locks, vesting streams and Merkle airdrops on Elysium Mainnet 99901. Deployed Vault, Airdrop and Score contracts with public records.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: TITLE, template: "%s · Raqio" },
  description: DESCRIPTION,
  applicationName: "Raqio",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
  openGraph: { type: "website", siteName: "Raqio", title: TITLE, description: DESCRIPTION, images: ["/art/og.jpg"] },
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
