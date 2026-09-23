"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import PageHeader from "@/components/app/PageHeader";
import { useMe } from "@/components/app/AppShell";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { OPERATION_KIND, OPERATION_KIND_INFO, type OperationKind } from "@/lib/domain/states";

const PLACEHOLDER: Record<OperationKind, string> = {
  CLAIM: "October allocation claim",
  ACCUMULATE: "Q4 accumulation plan",
  OTC: "Block vs. desk 7",
  TREASURY: "Weekly delegated payouts",
};

export default function NewOperationPage() {
  const me = useMe();
  const router = useRouter();
  const { toast } = useToast();
  const [kind, setKind] = useState<OperationKind | null>(null);
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [deadline, setDeadline] = useState("");
  const [jitter, setJitter] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me.can("batch.create")) router.replace("/app/batches");
  }, [me, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!kind) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ batch: { id: string } }>("/api/batches", { method: "POST", json: { name, kind, reference: reference || null, deadlineAt: deadline ? new Date(deadline).toISOString() : null, jitterMaxSeconds: jitter === "" ? null : Number(jitter) * 60 } });
      toast("Operation created", { tone: "success" });
      router.push(`/app/batches/${res.batch.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader back={{ href: "/app/batches", label: "Operations" }} eyebrow="Stage 1 of 7 · Legs" title="New operation" description="Pick the kind of operation, name it, then add its legs. Nothing is executed until the operation is approved and funded." />

      <section aria-label="Operation kind" className="mb-6">
        <p className="eyebrow mb-3">Operation kind</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Operation kind">
          {OPERATION_KIND.map((k) => {
            const info = OPERATION_KIND_INFO[k];
            const selected = kind === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`kind-${k}`}
                onClick={() => setKind(k)}
                className={`card p-4 text-left transition-colors ${selected ? "bg-ink text-on-ink" : "hover:bg-field"}`}
              >
                <div className="eyebrow" style={selected ? { color: "inherit", opacity: 0.7 } : undefined}>
                  {k} · {info.contract}
                </div>
                <div className="mt-1 font-medium">{info.label}</div>
                <p className={`mt-2 text-[0.8125rem] ${selected ? "opacity-80" : "text-ink-soft"}`}>{info.summary}</p>
                <p className={`mt-2 text-[0.75rem] ${selected ? "opacity-70" : "text-ink-faint"}`}>{info.legs}</p>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[0.8125rem] text-ink-faint">Privacy means the wallet that owns the funds or the eligibility is not the destination on-chain. Amounts, timing and the desk contract address stay visible. Fresh addresses can hold USDG; Robinhood Stock Tokens have transfer restrictions on sender and receiver, so an unverified fresh address cannot hold them.</p>
      </section>

      <form onSubmit={submit} className="card max-w-xl p-6 space-y-5" noValidate>
        <Input label="Operation name" required maxLength={120} placeholder={kind ? PLACEHOLDER[kind] : "Pick a kind first"} value={name} onChange={(e) => setName(e.target.value)} disabled={!kind} />
        <Input label="Internal reference (optional)" maxLength={120} placeholder="2026-10" value={reference} onChange={(e) => setReference(e.target.value)} help="Shown in exports and the activity feed." disabled={!kind} />
        <Input label="Deadline (optional)" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} help="No leg is scheduled past this time." disabled={!kind} />
        <Input label="Maximum spacing between legs, minutes (optional)" type="number" min={0} max={30} step={1} value={jitter} onChange={(e) => setJitter(e.target.value === "" ? "" : Number(e.target.value))} help="0 or empty = execute as fast as the queue allows. A leg's not-before time always wins. Spacing is operational, not a privacy guarantee." disabled={!kind} />
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <Button type="submit" variant="primary" loading={busy} disabled={!kind || !name.trim()}>
            Create and add legs
          </Button>
          <Button href="/app/batches" variant="ghost">
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
