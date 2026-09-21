"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import PageHeader from "@/components/app/PageHeader";
import { useMe } from "@/components/app/AppShell";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";

export default function NewBatchPage() {
  const me = useMe();
  const router = useRouter();
  const { toast } = useToast();
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
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ batch: { id: string } }>("/api/batches", { method: "POST", json: { name, reference: reference || null, deadlineAt: deadline ? new Date(deadline).toISOString() : null, jitterMaxSeconds: jitter === "" ? null : Number(jitter) * 60 } });
      toast("Batch created", { tone: "success" });
      router.push(`/app/batches/${res.batch.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader back={{ href: "/app/batches", label: "Batches" }} eyebrow="Step 1 of 6 · Batch details" title="New batch" description="Name the batch first. You will upload and validate the CSV next; nothing is executed until it is approved and funded." />
      <form onSubmit={submit} className="card max-w-xl p-6 space-y-5" noValidate>
        <Input label="Batch name" required maxLength={120} placeholder="October contractor payroll" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Internal reference (optional)" maxLength={120} placeholder="2026-10" value={reference} onChange={(e) => setReference(e.target.value)} help="Shown in exports and the activity feed." />
        <Input label="Deadline (optional)" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} help="Execution will not be scheduled past this time." />
        <Input label="Maximum spacing between submissions, minutes (optional)" type="number" min={0} max={30} step={1} value={jitter} onChange={(e) => setJitter(e.target.value === "" ? "" : Number(e.target.value))} help="0 or empty = submit as fast as the queue allows. Spacing is operational, not a privacy guarantee. Never past the deadline." />
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <Button type="submit" variant="primary" loading={busy} disabled={!name.trim()}>
            Create and continue
          </Button>
          <Button href="/app/batches" variant="ghost">
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
