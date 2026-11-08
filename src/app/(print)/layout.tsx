import type { ReactNode } from "react";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import CookieBanner from "@/components/marketing/CookieBanner";
import { getSession } from "@/lib/auth/session";

export default async function PrintLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <div className="min-h-screen bg-bg text-fg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[400] focus:bg-signal focus:text-bg focus:px-4 focus:py-2 focus:rounded-lg">
        Skip to content
      </a>
      <Navbar signedIn={!!session} />
      <main id="main">{children}</main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
