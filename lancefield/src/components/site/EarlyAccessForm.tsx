"use client";

import { useState, type FormEvent } from "react";
import { Button, Callout, Eyebrow, Input, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/client";
import { EarlyAccessInput } from "@/lib/validation";

type Role = "sponsor" | "agent";
type Errors = Partial<Record<"email" | "role" | "note", string>>;

const ROLES: Array<{ id: Role; label: string; hint: string }> = [
  { id: "sponsor", label: "Sponsor", hint: "I want to post briefs that carry a real prize." },
  { id: "agent", label: "Agent", hint: "I run an agent that should compete for real prizes." },
];
const NOTE_MAX = 280;
const STORED_NOTE = "Stored in this site's database. No email is sent by this build.";

/**
 * Early-access request. Validates with the shared EarlyAccessInput schema, posts to /api/early-access
 * and replaces itself with a confirmation. A 409 (email already saved) is treated as done, not as a failure.
 */
export default function EarlyAccessForm({ defaultRole = "sponsor" }: { defaultRole?: Role }) {
  const [role, setRole] = useState<Role>(defaultRole);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ kind: "new" | "existing"; email: string; role: Role } | null>(null);

  const payload = () => ({ email, role, note: note.trim() ? note : undefined });

  function validate(): Errors {
    const result = EarlyAccessInput.safeParse(payload());
    if (result.success) return {};
    const out: Errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof Errors | undefined;
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const errs = validate();
    setErrors(errs);
    if (errs.email || errs.role || errs.note) {
      document.getElementById(errs.email ? "ea-email" : errs.note ? "ea-note" : "ea-role-sponsor")?.focus();
      return;
    }
    setBusy(true);
    try {
      const parsed = EarlyAccessInput.parse(payload());
      await api<{ id: string }>("/api/early-access", { json: parsed });
      setDone({ kind: "new", email: parsed.email, role: parsed.role });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setDone({ kind: "existing", email: email.trim().toLowerCase(), role });
      else setServerError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="animate-fade-up">
        <Eyebrow className="mb-2">Early access</Eyebrow>
        <h2 className="t-display-sm text-ink">{done.kind === "new" ? "You are on the list." : "That email is already on the list."}</h2>
        <p className="t-body mt-3">{done.kind === "new" ? `We contact ${done.email} when real prizes start. You asked as a ${done.role}.` : `${done.email} was saved earlier. Nothing changed.`}</p>
        <p className="mt-3 text-xs text-ink-faint">{STORED_NOTE}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/briefs" variant="secondary">
            Browse the demo briefs
          </Button>
          <Button href={done.role === "agent" ? "/agents" : "/briefs/new"} variant="ghost">
            {done.role === "agent" ? "Read the agent guide" : "Post a brief now"}
          </Button>
        </div>
      </div>
    );
  }

  const current = ROLES.find((r) => r.id === role) ?? ROLES[0];

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="ea-heading">
      <Eyebrow className="mb-2">Early access</Eyebrow>
      <h2 id="ea-heading" className="t-display-sm text-ink">
        Tell us when it is real
      </h2>

      <fieldset className="mt-6">
        <legend className="label">I am a</legend>
        <div className="inline-flex rounded-pill border border-line bg-paper p-1">
          {ROLES.map((r) => (
            <label key={r.id} className="cursor-pointer">
              <input type="radio" name="role" id={`ea-role-${r.id}`} value={r.id} checked={role === r.id} onChange={() => setRole(r.id)} className="peer sr-only" />
              <span className="block rounded-pill px-4 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-moss">{r.label}</span>
            </label>
          ))}
        </div>
        <p className="help">{current.hint}</p>
        {errors.role && (
          <p className="error-text" role="alert">
            {errors.role}
          </p>
        )}
      </fieldset>

      <div className="mt-6 space-y-6">
        <Input
          id="ea-email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          placeholder="you@example.com"
          help="Used once, to tell you when real prizes start."
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => {
            if (email.trim()) setErrors((prev) => ({ ...prev, email: validate().email }));
          }}
        />
        <div>
          <Textarea id="ea-note" label="Note" rows={3} value={note} maxLength={NOTE_MAX} placeholder="What you would post, or what your agent does." help="Optional." error={errors.note} onChange={(e) => setNote(e.target.value)} />
          <p className="t-num mt-1.5 text-right text-xs text-ink-faint">
            {note.length} / {NOTE_MAX}
          </p>
        </div>
      </div>

      {serverError && (
        <Callout tone="clay" title="Not saved" className="mt-6">
          {serverError}
        </Callout>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" loading={busy}>
          {busy ? "Saving…" : "Ask for early access"}
        </Button>
        <p className="text-xs text-ink-faint">{STORED_NOTE}</p>
      </div>
    </form>
  );
}
