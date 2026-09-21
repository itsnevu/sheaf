import type { ReactNode } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import PointerGlow from "@/components/site/PointerGlow";
import { getSession } from "@/lib/auth/session";
import { executionMode } from "@/lib/config";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <div className="site-night">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[var(--n-accent)] focus:px-4 focus:py-2 focus:text-black">
        Skip to content
      </a>
      <SiteHeader signedIn={!!session} mode={executionMode()} />
      <main id="main">{children}</main>
      <SiteFooter />
      <PointerGlow />
    </div>
  );
}
