import type { ReactNode } from "react";
import Navbar from "@/components/marketing/Navbar";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[400] focus:bg-signal focus:text-bg focus:px-4 focus:py-2 focus:rounded-lg">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="auth-layout">
        <div className="auth-container">
          <div className="card">
            {children}
          </div>
          <div className="flex justify-center gap-6 mt-6 text-sm text-faint">
            <a href="/docs" className="hover:text-signal transition-colors">Docs</a>
            <a href="/security" className="hover:text-signal transition-colors">Security</a>
          </div>
        </div>
      </main>
    </div>
  );
}
