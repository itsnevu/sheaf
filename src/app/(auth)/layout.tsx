import type { ReactNode } from "react";
import { Space_Mono } from "next/font/google";
import Backdrop from "@/components/print/Backdrop";
import PrintNav from "@/components/print/PrintNav";
import { executionMode } from "@/lib/config";
import "@/styles/print.css";
import "@/styles/sheet.css";
import "@/styles/deck.css";

const spaceMono = Space_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "700"], display: "swap" });

/** Sign in and sign up sit on the same bench as the index: mark top-left, a bordered box in the middle. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`site-print ${spaceMono.variable}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[400] focus:bg-black focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Backdrop mode={executionMode()} />
      <PrintNav />
      <main id="main" className="x-page">
        <div className="x-auth">{children}</div>
        <div className="x-contact">
          <a href="/docs">docs</a>
          <a href="/security">security</a>
        </div>
      </main>
    </div>
  );
}
