"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LogoLink } from "@/components/Logo";
import { IconX } from "@/components/ui";
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

const NAV: Array<{ href: string; label: string; icon: ReactNode; exact?: boolean }> = [
  { href: "/app", label: "Overview", exact: true, icon: <Ico d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> },
  { href: "/app/batches", label: "Batches", icon: <Ico d="M4 5h16v4H4zM4 11h16v4H4zM4 17h16v3H4z" /> },
  { href: "/app/activity", label: "Activity", icon: <Ico d="M3 12h4l3-8 4 16 3-8h4" /> },
  { href: "/app/reconciliation", label: "Reconciliation", icon: <Ico d="M4 7h16M4 12h10M4 17h7M17 15l2 2 4-4" /> },
  { href: "/app/settings", label: "Settings", icon: <Ico d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z" /> },
];

function Ico({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function AppShell({ user, capabilities, mode, demoBanner, children }: { user: MeContext["user"]; capabilities: Capability[]; mode: "demo" | "real"; demoBanner: string; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const value: MeContext = { user, capabilities, mode, can: (c) => capabilities.includes(c) };

  const signOut = async () => {
    await api("/api/auth/sign-out", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const nav = (
    <nav aria-label="Application" className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = n.exact ? path === n.href : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9rem] transition-colors ${active ? "bg-ink text-on-ink" : "text-ink-soft hover:bg-ink/5 hover:text-ink"}`}>
            {n.icon}
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <Ctx.Provider value={value}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex sticky top-0 h-dvh flex-col border-r border-line bg-surface/60 px-4 py-5">
          <LogoLink href="/app" />
          <div className="mt-8 flex-1">{nav}</div>
          <UserCard user={user} onSignOut={signOut} />
        </aside>

        <div className="min-w-0 flex flex-col">
          {/* Mode banner */}
          <div role="status" className={`px-4 py-2 text-center text-[0.8125rem] font-medium ${mode === "demo" ? "bg-warning-tint text-warning" : "bg-veil-tint text-veil-deep"}`}>
            {mode === "demo" ? demoBanner : "Real mode — routes are quoted live and transactions are signed by the connected treasury wallet."}
          </div>
          {/* Top bar (mobile) */}
          <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur">
            <LogoLink href="/app" />
            <button type="button" className="btn btn-ghost btn-sm !px-2" aria-expanded={open} aria-controls="app-nav" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((o) => !o)}>
              {open ? <IconX /> : <Ico d="M3 6h18M3 12h18M3 18h18" />}
            </button>
          </div>
          {open && (
            <div id="app-nav" className="lg:hidden border-b border-line bg-surface px-4 py-4 animate-fade-in">
              {nav}
              <div className="mt-4">
                <UserCard user={user} onSignOut={signOut} />
              </div>
            </div>
          )}
          <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="mx-auto w-full max-w-[1200px]">{children}</div>
          </main>
        </div>
      </div>
    </Ctx.Provider>
  );
}

function UserCard({ user, onSignOut }: { user: MeContext["user"]; onSignOut: () => void }) {
  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <div className="truncate text-[0.875rem] font-medium">{user.name}</div>
      <div className="truncate text-[0.75rem] text-ink-faint">{user.email}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="badge badge-neutral">{statusLabel(user.role)}</span>
        <button type="button" onClick={onSignOut} className="text-[0.8125rem] text-ink-soft hover:text-ink">
          Sign out
        </button>
      </div>
      <div className="mt-1 truncate text-[0.75rem] text-ink-faint">{user.organizationName}</div>
    </div>
  );
}
