import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import { getSession } from "@/lib/auth/session";
import { capabilitiesFor } from "@/lib/auth/permissions";
import { DEMO_BANNER, executionMode } from "@/lib/config";
import "@/styles/print.css";
import "@/styles/sheet.css";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/app");
  const mode = executionMode();
  return (
    <AppShell user={{ name: session.name, email: session.email, role: session.role, organizationName: session.organizationName }} capabilities={capabilitiesFor(session.role)} mode={mode} demoBanner={DEMO_BANNER}>
      {children}
    </AppShell>
  );
}
