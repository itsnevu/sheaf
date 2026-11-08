"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LogoLink } from "@/components/Logo";
import type { Capability } from "@/lib/auth/permissions";
import { statusLabel } from "@/lib/domain/states";
import { api } from "@/lib/client";

export interface MeContext {
  user: { name: string; email: string; role: string; organizationName: string };
  capabilities: Capability[];
  mode: "demo" | "real";
  can: (c: Capability) => boolean;
}
const Ctx = createContext<MeContext | null>(null);
export function useMe(): MeContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMe outside AppShell");
  return v;
}

const NAV: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/app", label: "Overview", exact: true },
  { href: "/app/batches", label: "Operations" },
  { href: "/app/executions", label: "Executions" },
  { href: "/app/reconciliation", label: "Reconciliation" },
  { href: "/app/activity", label: "Activity" },
  { href: "/app/settings", label: "Settings" },
];

export default function AppShell({ user, capabilities, mode, demoBanner, children }: { user: MeContext["user"]; capabilities: Capability[]; mode: "demo" | "real"; demoBanner: string; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => setSidebarOpen(false), [path]);
  const value: MeContext = { user, capabilities, mode, can: (c) => capabilities.includes(c) };

  const signOut = async () => {
    await api("/api/auth/sign-out", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <Ctx.Provider value={value}>
      <div className="desk-shell min-h-screen bg-bg text-fg">
        {/* Top bar */}
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-bg/85 backdrop-blur-lg border-b border-line flex items-center px-4 md:px-6">
          <button
            type="button"
            className="md:hidden mr-3 flex flex-col gap-1 p-1.5"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <span className="block w-4 h-0.5 bg-fg" />
            <span className="block w-4 h-0.5 bg-fg" />
            <span className="block w-4 h-0.5 bg-fg" />
          </button>
          <LogoLink href="/app" />
          <div className="ml-auto flex items-center gap-4">
            <span className="badge badge-info text-xs hidden sm:inline-flex">
              <span className="badge-dot" />
              {mode === "demo" ? "Testnet" : "Live"}
            </span>
            <span className="text-xs text-muted hidden md:inline">{user.name || statusLabel(user.role)}</span>
            <button type="button" onClick={signOut} className="text-xs text-faint hover:text-signal transition-colors">Sign out</button>
          </div>
        </header>

        <div className="flex pt-16">
          {/* Sidebar */}
          <aside className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] w-56 bg-bg md:bg-transparent border-r border-line z-40 transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <nav className="p-4 space-y-1" aria-label="Application">
              {NAV.map((n) => {
                const active = n.exact ? path === n.href : n.href !== "/" && (path.startsWith(n.href) || (n.href === "/app/executions" && path.startsWith("/app/payments")));
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-signal/10 text-signal font-medium" : "text-muted hover:text-fg hover:bg-white/[0.03]"}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {n.label}
                  </Link>
                );
              })}
              <Link href="/" className="block px-3 py-2 rounded-lg text-sm text-faint hover:text-muted transition-colors mt-4">
                ← Back to site
              </Link>
            </nav>
          </aside>

          {/* Backdrop on mobile */}
          {sidebarOpen && <div className="fixed inset-0 z-30 bg-bg/60 md:hidden" onClick={() => setSidebarOpen(false)} />}

          {/* Main */}
          <main id="main" className="flex-1 min-w-0 p-4 md:p-8">
            {mode === "demo" && (
              <div className="mb-6 p-3 rounded-lg bg-signal/10 border border-signal/20 text-sm text-signal font-mono">
                {demoBanner}
              </div>
            )}
            {children}
          </main>
        </div>

        {/* Status bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 h-7 bg-surface/80 backdrop-blur border-t border-line flex items-center px-4 gap-4 text-xs font-mono">
          <span className="text-faint truncate">
            {user.name && user.name !== statusLabel(user.role) ? `${user.name} · ` : ""}{statusLabel(user.role)} · {user.organizationName}
          </span>
          <span className={`ml-auto ${mode === "demo" ? "text-signal" : "text-positive"}`}>
            {mode === "demo" ? demoBanner : "Real mode: routes quoted live by Relay"}
          </span>
        </div>
      </div>
    </Ctx.Provider>
  );
}
