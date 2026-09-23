"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import WalletSignIn from "@/components/auth/WalletSignIn";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/client";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setPassword("sheaf-demo-2026");
  };

  return (
    <>
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
