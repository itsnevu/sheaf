"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/app/PageHeader";
import { useMe } from "@/components/app/AppShell";
import { Button, Dialog, Input, Select, Skeleton, Switch, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client";
import { ROLES, statusLabel } from "@/lib/domain/states";

interface Settings {
  organization: { id: string; name: string; slug: string; treasuryAddress: string | null; assetSymbol: string; assetDecimals: number; originChainId: number; destinationChainId: number; jitterEnabled: boolean; jitterMaxSeconds: number; requireFourEyes: boolean; maxRetries: number };
  members: Array<{ id: string; userId: string; name: string; email: string; role: string }>;
  mode: "demo" | "real";
  provider: { label: string; detail: string };
  chains: Array<{ id: number; name: string; assets: string[] }>;
}

export default function SettingsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useQuery({ queryKey: ["settings"], queryFn: () => api<Settings>("/api/settings") });
  const [form, setForm] = useState<Settings["organization"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState(false);
  const [temp, setTemp] = useState<string | null>(null);
  useEffect(() => {
    if (q.data && !form) setForm(q.data.organization);
  }, [q.data, form]);
  const canEdit = me.can("settings.edit");

  const save = async () => {
    if (!form) return;
    setBusy(true);
    try {
      await api("/api/settings", { method: "PATCH", json: { name: form.name, treasuryAddress: form.treasuryAddress ?? "", assetSymbol: form.assetSymbol, originChainId: form.originChainId, destinationChainId: form.destinationChainId, jitterEnabled: form.jitterEnabled, jitterMaxSeconds: form.jitterMaxSeconds, requireFourEyes: form.requireFourEyes, maxRetries: form.maxRetries } });
      toast("Settings saved", { tone: "success" });
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) {
      toast((e as Error).message, { tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  if (!q.data || !form) return <Skeleton className="h-64" />;
  const s = q.data;
  const chain = (id: number) => s.chains.find((c) => c.id === id);
  const assets = Array.from(new Set([...(chain(form.originChainId)?.assets ?? []), ...(chain(form.destinationChainId)?.assets ?? [])])).filter((a) => chain(form.originChainId)?.assets.includes(a) && chain(form.destinationChainId)?.assets.includes(a));

  return (
    <>
      <PageHeader title="Settings" description={`${s.organization.name} · ${canEdit ? "changes are logged in the activity feed" : "read-only for your role"}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6 space-y-5">
          <h2 className="title-2">Organisation</h2>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canEdit} />
          <div>
            <div className="label">Execution mode</div>
            <div className="flex items-center gap-2 text-[0.9rem]">
              <StatusBadge tone={s.mode === "demo" ? "warning" : "progress"}>{s.mode === "demo" ? "Demo (simulated)" : "Real"}</StatusBadge>
              <span className="text-ink-faint text-[0.8125rem]">set by SHEAF_MODE on the server; cannot be changed here</span>
            </div>
            <p className="help">Provider: {s.provider.label} — {s.provider.detail}</p>
          </div>
        </section>

        <section className="card p-6 space-y-5">
          <h2 className="title-2">Treasury and network</h2>
          <Input label="Treasury wallet address" value={form.treasuryAddress ?? ""} onChange={(e) => setForm({ ...form, treasuryAddress: e.target.value })} disabled={!canEdit} placeholder="0x…" spellCheck={false} className="font-mono" help={s.mode === "real" ? "Required in real mode: only this wallet may fund and sign batches." : "Optional in demo mode; used as the simulated sender."} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Funding network (origin)" value={form.originChainId} onChange={(e) => setForm({ ...form, originChainId: Number(e.target.value) })} disabled={!canEdit}>
              {s.chains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select label="Payout network (destination)" value={form.destinationChainId} onChange={(e) => setForm({ ...form, destinationChainId: Number(e.target.value) })} disabled={!canEdit}>
              {s.chains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <Select label="Asset" value={form.assetSymbol} onChange={(e) => setForm({ ...form, assetSymbol: e.target.value })} disabled={!canEdit} help={assets.length ? "Applies to new batches only." : "No shared asset is configured for this network pair."}>
            {(assets.length ? assets : [form.assetSymbol]).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          {form.originChainId === form.destinationChainId && <p className="text-[0.8125rem] text-warning">Same-chain routes are direct transfers from the treasury: no external privacy benefit.</p>}
        </section>

        <section className="card p-6 space-y-5">
          <h2 className="title-2">Payment preferences</h2>
          <Switch checked={form.jitterEnabled} onChange={(v) => setForm({ ...form, jitterEnabled: v })} disabled={!canEdit} label="Space out submissions by default" help="Adds a random delay (0 to the maximum below) before each payment is submitted. Operational only, never past a batch deadline, timestamps retained internally. Not a privacy guarantee." />
          <Input label="Maximum spacing (seconds, 0–1800)" type="number" min={0} max={1800} value={form.jitterMaxSeconds} onChange={(e) => setForm({ ...form, jitterMaxSeconds: Math.max(0, Math.min(1800, Number(e.target.value) || 0)) })} disabled={!canEdit || !form.jitterEnabled} />
          <Input label="Maximum retries per payment" type="number" min={0} max={10} value={form.maxRetries} onChange={(e) => setForm({ ...form, maxRetries: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} disabled={!canEdit} help="Only provider-classified transient failures are retryable." />
        </section>

        <section className="card p-6 space-y-5">
          <h2 className="title-2">Security preferences</h2>
          <Switch checked={form.requireFourEyes} onChange={(v) => setForm({ ...form, requireFourEyes: v })} disabled={!canEdit} label="Four-eyes approval" help="The person who last edited the recipient set cannot approve it." />
          <p className="text-[0.8125rem] text-ink-faint">Sessions last 14 days and are revoked when a member is removed. Passwords are hashed with scrypt.</p>
        </section>
      </div>
      {canEdit && (
        <div className="mt-6 flex gap-2">
          <Button variant="primary" loading={busy} onClick={save}>
            Save settings
          </Button>
          <Button variant="ghost" onClick={() => setForm(s.organization)}>
            Reset
          </Button>
        </div>
      )}

      <section className="card mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="title-2">Members</h2>
          {me.can("members.manage") && (
            <Button size="sm" variant="primary" onClick={() => setInvite(true)}>
              Add member
            </Button>
          )}
        </div>
        <ul className="divide-y divide-line">
          {s.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-[0.8125rem] text-ink-faint">{m.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {me.can("members.manage") ? (
                  <Select aria-label={`Role for ${m.email}`} value={m.role} onChange={async (e) => { try { await api("/api/settings/members", { method: "PATCH", json: { membershipId: m.id, role: e.target.value } }); toast("Role updated", { tone: "success" }); qc.invalidateQueries({ queryKey: ["settings"] }); } catch (err) { toast((err as Error).message, { tone: "danger" }); } }} className="w-44">
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {statusLabel(r)}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <StatusBadge tone="neutral">{statusLabel(m.role)}</StatusBadge>
                )}
                {me.can("members.manage") && m.email !== me.user.email && (
                  <Button size="sm" variant="ghost" className="!text-danger" onClick={async () => { if (!confirm(`Remove ${m.email}?`)) return; try { await api(`/api/settings/members?membershipId=${m.id}`, { method: "DELETE" }); toast("Member removed"); qc.invalidateQueries({ queryKey: ["settings"] }); } catch (err) { toast((err as Error).message, { tone: "danger" }); } }}>
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {invite && (
        <InviteDialog
          onClose={() => {
            setInvite(false);
            setTemp(null);
          }}
          temp={temp}
          onAdd={async (body) => {
            try {
              const res = await api<{ tempPassword: string | null }>("/api/settings/members", { method: "POST", json: body });
              toast("Member added", { tone: "success" });
              qc.invalidateQueries({ queryKey: ["settings"] });
              setTemp(res.tempPassword);
              if (!res.tempPassword) setInvite(false);
            } catch (e) {
              toast((e as Error).message, { tone: "danger" });
            }
          }}
        />
      )}
    </>
  );
}

function InviteDialog({ onClose, onAdd, temp }: { onClose: () => void; onAdd: (b: { name: string; email: string; role: string }) => Promise<void>; temp: string | null }) {
  const [f, setF] = useState({ name: "", email: "", role: "VIEWER" });
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title="Add member" footer={temp ? <Button variant="primary" onClick={onClose}>Done</Button> : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!f.name || !f.email} onClick={async () => { setBusy(true); try { await onAdd(f); } finally { setBusy(false); } }}>Add</Button></>}>
      {temp ? (
        <div className="space-y-3 text-[0.9375rem]">
          <p>Account created. Share this temporary password securely; it is shown once.</p>
          <p className="mono-data rounded-card border border-line bg-field p-3 select-all">{temp}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Input label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Select label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {statusLabel(r)}
              </option>
            ))}
          </Select>
          <p className="text-[0.8125rem] text-ink-faint">If the email is new, a temporary password is generated. No email is sent.</p>
        </div>
      )}
    </Dialog>
  );
}
