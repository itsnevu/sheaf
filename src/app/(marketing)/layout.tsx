import type { ReactNode } from "react";
import { Anek_Latin, Space_Mono } from "next/font/google";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Effects from "@/components/site/Effects";
import { getSession } from "@/lib/auth/session";
import { executionMode } from "@/lib/config";

/* The marketing site overrides the app's type inside its own subtree:
   Space Mono for display and labels, Anek Latin for body copy. */
const anek = Anek_Latin({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });
const spaceMono = Space_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "700"], display: "swap" });

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <div className={`site-night ${anek.variable} ${spaceMono.variable}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[var(--n-accent)] focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <SiteHeader signedIn={!!session} mode={executionMode()} />
      <main id="main">{children}</main>
      <SiteFooter />
      <Effects />
      <div className="n-grain" aria-hidden="true" />
    </div>
  );
}
