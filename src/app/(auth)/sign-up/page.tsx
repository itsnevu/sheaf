"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import WalletSignIn from "@/components/auth/WalletSignIn";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/client";

export default function SignUpPage() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", organization: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/sign-up", { method: "POST", json: f });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="title-1">Start a desk</h1>
      <div className="mt-6">
        <WalletSignIn />
      </div>
      <p className="eyebrow mt-8">or with email</p>
      <p className="mt-2 text-[0.9375rem] text-ink-soft">You become the Owner and can invite desk operators, approvers and viewers from Settings.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <Input label="Organisation name" required value={f.organization} onChange={set("organization")} />
        <Input label="Your name" required autoComplete="name" value={f.name} onChange={set("name")} />
        <Input label="Email" type="email" required autoComplete="email" value={f.email} onChange={set("email")} />
        <Input label="Password" type="password" required autoComplete="new-password" minLength={10} help="At least 10 characters." value={f.password} onChange={set("password")} />
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Create desk
        </Button>
      </form>
      <p className="mt-6 text-[0.875rem] text-ink-soft">
        Already have one?{" "}
        <Link href="/sign-in" className="link">
          Sign in
        </Link>
      </p>
    </>
  );
}
