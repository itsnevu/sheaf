"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
  { href: "/app", label: "__Overview", exact: true },
  { href: "/app/batches", label: "OPERATIONS_###" },
  { href: "/app/executions", label: "EXECUTIONS_###" },
  { href: "/app/reconciliation", label: "RECONCILIATION_###" },
  { href: "/app/activity", label: "ACTIVITY_###" },
  { href: "/app/settings", label: "SETTINGS_###" },
  { href: "/", label: "SITE_###" },
];

/**
 * The desk on the same white sheet as the site: the red mark top-left opens a bordered
 * mono list of instruments, the workspace and mode sit bottom-right, the page fills the middle.
 */
export default function AppShell({ user, capabilities, mode, demoBanner, children }: { user: MeContext["user"]; capabilities: Capability[]; mode: "demo" | "real"; demoBanner: string; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !(e.target as HTMLElement).closest(".p-nav") && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [open]);
  const value: MeContext = { user, capabilities, mode, can: (c) => capabilities.includes(c) };

  const signOut = async () => {
    await api("/api/auth/sign-out", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <Ctx.Provider value={value}>
      <div className="site-print">
        <div className="p-nav">
          <button type="button" className="p-burger" aria-expanded={open} aria-controls="app-nav" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((o) => !o)}>
            <span />
            <span />
            <span />
          </button>
          <nav id="app-nav" aria-label="Application" className="p-menu" data-open={open}>
            {NAV.map((n) => {
              const active = n.exact ? path === n.href : n.href !== "/" && (path.startsWith(n.href) || (n.href === "/app/executions" && path.startsWith("/app/payments")));
              return active ? (
                <span key={n.href} className="is-current" aria-current="page">
                  {n.label}
                </span>
              ) : (
                <Link key={n.href} href={n.href}>
                  {n.label}
                </Link>
              );
            })}
            <button type="button" onClick={signOut} className="p-menu-action">
              SIGN_OUT
            </button>
          </nav>
        </div>
        <main id="main" className="x-app">
          {children}
        </main>
        <div className="x-status" role="status">
          <span className="x-status-user">
            {user.name && user.name !== statusLabel(user.role) ? `${user.name} · ` : ""}{statusLabel(user.role)} · {user.organizationName}
          </span>
          <span className={mode === "demo" ? "x-status-demo" : "x-status-real"}>{mode === "demo" ? demoBanner : "Real mode — routes are quoted live by Relay and every leg is signed by the connected desk wallet."}</span>
        </div>
      </div>
    </Ctx.Provider>
  );
}
