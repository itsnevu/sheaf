"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import WalletSignIn from "@/components/auth/WalletSignIn";
import { Mark } from "@/components/Logo";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/client";

/** The four seeded roles of the demo desk, with what each may do. */
const ROLES: Array<{ who: string; role: string; code: string; can: string }> = [
  { who: "owner", role: "OWNER", code: "R1", can: "Everything: roles, caps, funding, approval, withdrawal." },
  { who: "desk", role: "DESK OPERATOR", code: "R2", can: "Prepare, fund, execute, retry, reconcile, export." },
  { who: "approver", role: "APPROVER", code: "R3", can: "Approve what someone else prepared. Export." },
  { who: "viewer", role: "VIEWER", code: "R4", can: "Read only. Addresses are redacted." },
];

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/sign-in", { method: "POST", json: { email, password } });
      router.push(params.get("next") || "/app");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const demo = (who: string) => {
    setEmail(`${who}@halden.example`);
    setPassword("Raqio-demo-2026");
    setPicked(who);
  };
  const badge = ROLES.find((r) => r.who === picked);

  return (
    <>
      <aside className="x-badge" aria-label="Demo desk access badge">
        <p className="x-badge-head"><span>ACCESS BADGE</span><span>HALDEN DESK · DEMO</span></p>
        <div className="x-badge-id">
          <span className="x-badge-photo"><Mark size={44} /></span>
          <dl>
            <div><dt>HOLDER</dt><dd>{badge ? `${badge.who}@halden.example` : "pick a role"}</dd></div>
            <div><dt>ROLE</dt><dd>{badge?.role ?? "—"}</dd></div>
            <div><dt>DESK</dt><dd>RH-99901 · HALDEN</dd></div>
          </dl>
        </div>
        <p className="x-badge-sub">ROLES ON THIS DESK</p>
        <ol className="x-badge-roles">
          {ROLES.map((r) => (
            <li key={r.who} data-on={picked === r.who}>
              <button type="button" onClick={() => demo(r.who)} aria-pressed={picked === r.who}>
                <span className="x-badge-code">{r.code}</span>
                <span className="x-badge-role">{r.role}</span>
                <span className="x-badge-can">{r.can}</span>
                <span className="x-badge-use">USE</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="x-badge-bar" aria-hidden="true" />
        <p className="x-badge-foot">EVERYTHING ON THE DEMO DESK IS SIMULATED AND LABELLED AS SUCH. NO FUNDS MOVE.</p>
      </aside>
      <div className="x-box">
      <h1 className="title-1">Sign in</h1>
      <p className="mt-2 text-[0.9375rem] text-ink-soft">Sign a message with your wallet, or use desk credentials.</p>
      <div className="mt-6">
        <WalletSignIn next={params.get("next") || "/app"} />
      </div>
      <p className="eyebrow mt-8">or with email</p>
      <form onSubmit={submit} className="mt-3 space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>
      <div className="mt-8 rounded-card border border-line bg-surface p-4">
        <p className="text-[0.8125rem] font-medium">Demo desk (Halden Desk)</p>
        <p className="mt-1 text-[0.8125rem] text-ink-faint">Fill the form with a seeded account, then sign in. Everything in the demo is simulated and labelled as such.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["owner", "desk", "approver", "viewer"].map((w) => (
            <button key={w} type="button" onClick={() => demo(w)} className="btn btn-secondary btn-sm">
              {w}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-6 text-[0.875rem] text-ink-soft">
        New here?{" "}
        <Link href="/sign-up" className="link">
          Start a desk
        </Link>
      </p>
      </div>
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
