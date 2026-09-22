import type { ReactNode } from "react";
import { Space_Mono } from "next/font/google";
import { pixel } from "@/components/print/fonts";
import PrintNav from "@/components/print/PrintNav";
import { getSession } from "@/lib/auth/session";
import "@/styles/print.css";
import "@/styles/sheet.css";

/* The home page is an instrument: Space Mono on the device, a pixel face on the paper. */
const spaceMono = Space_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "700"], display: "swap" });

export default async function PrintLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <div className={`site-print ${spaceMono.variable} ${pixel.variable}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[400] focus:bg-black focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <PrintNav signedIn={!!session} />
      <main id="main">{children}</main>
    </div>
  );
}
