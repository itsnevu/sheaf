/**
 * Square product visuals for the three product rows, built from real dashboard states
 * (validation, review/approval, execution) rendered in the night palette. Original artwork.
 */
const ROWS = [
  ["Ada Okafor", "0x1b3f…9f0a", "1,250.00", "ok"],
  ["Mateo Ruiz", "0x9f0e…7f8e", "980.50", "ok"],
  ["K. Watanabe", "0x7a9b…5f24", "3,200.00", "dup"],
  ["Priya N.", "0x3c4d…1c2d", "2,100.00", "ok"],
  ["Elias Berg", "0x2df0…9a70", "abc", "amt"],
] as const;

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden border border-[var(--n-line)] bg-[#0e0f12] n-clip">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-[var(--n-line-soft)] px-4 py-2.5">
        <span className="n-label text-[var(--n-muted)]">{label}</span>
        <span className="n-label text-[var(--n-accent)]">demo · simulated</span>
      </div>
      <div className="absolute inset-0 pt-12">{children}</div>
    </div>
  );
}

export function ValidateArt() {
  return (
    <Frame label="contractors.csv · 5 rows">
      <div className="flex h-full flex-col justify-between p-4 md:p-6">
        <ul className="space-y-2">
          {ROWS.map(([n, a, amt, s]) => (
            <li key={n} className={`grid grid-cols-[1.3fr_1.2fr_.8fr_auto] items-center gap-2 border px-3 py-2 text-[12px] md:text-[13px] ${s === "ok" ? "border-[var(--n-line-soft)]" : "border-red-400/40 bg-red-400/5"}`}>
              <span className="truncate font-medium">{n}</span>
              <span className="truncate font-mono text-[var(--n-muted)]">{a}</span>
              <span className={`text-right font-mono ${s === "amt" ? "text-red-300" : ""}`}>{amt}</span>
              <span className={`n-label ${s === "ok" ? "text-[var(--n-accent)]" : "text-red-300"}`}>{s === "ok" ? "valid" : s === "dup" ? "dup" : "amount"}</span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Valid", "3"],
            ["Invalid", "2"],
            ["Total", "4,330.50"],
          ].map(([k, v]) => (
            <div key={k} className="border border-[var(--n-line-soft)] px-3 py-2">
              <div className="n-label text-[var(--n-muted)]">{k}</div>
              <div className="font-mono text-lg">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function ReviewArt() {
  return (
    <Frame label="Review · before approval">
      <div className="flex h-full flex-col justify-between p-4 md:p-6">
        <dl className="grid grid-cols-2 gap-2">
          {[
            ["Recipients", "16 valid · 0 invalid"],
            ["Total", "24,396.89 USDC"],
            ["Est. fees", "$1.94 (estimate)"],
            ["Routes", "16/16 ready"],
            ["Asset · network", "USDC · Base"],
            ["Funding req.", "24,398.83 USDC"],
          ].map(([k, v]) => (
            <div key={k} className="border border-[var(--n-line-soft)] px-3 py-2">
              <dt className="n-label text-[var(--n-muted)]">{k}</dt>
              <dd className="mt-0.5 font-mono text-[13px] md:text-sm">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="border border-[var(--n-accent)]/40 bg-[var(--n-accent)]/5 p-4">
          <div className="n-label text-[var(--n-accent)]">Approval</div>
          <p className="mt-1 text-sm">approver@northwind.example approved 16 recipients</p>
          <p className="mt-1 font-mono text-[11px] text-[var(--n-muted)]">set hash b2b0fe28…2ac382c · any edit voids this</p>
        </div>
      </div>
    </Frame>
  );
}

export function ExecuteArt() {
  const rows = [
    ["Row 1", "Completed"],
    ["Row 2", "Completed"],
    ["Row 3", "Confirming"],
    ["Row 4", "Retry eligible"],
    ["Row 5", "Scheduled"],
    ["Row 6", "Completed"],
  ];
  return (
    <Frame label="Execution · 16 payments">
      <div className="flex h-full flex-col justify-between p-4 md:p-6">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--n-muted)]">Completed payments</span>
            <span className="font-mono">11/16</span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-white/10">
            <div className="h-full bg-[var(--n-accent)]" style={{ width: "68.75%" }} />
          </div>
        </div>
        <ul className="space-y-1.5">
          {rows.map(([r, s]) => (
            <li key={r} className="flex items-center justify-between border border-[var(--n-line-soft)] px-3 py-1.5 text-[13px]">
              <span className="font-mono text-[var(--n-muted)]">{r}</span>
              <span className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${s === "Completed" ? "bg-[var(--n-accent)]" : s === "Retry eligible" ? "bg-amber-300" : "bg-white/50"}`} />
                {s}
              </span>
            </li>
          ))}
        </ul>
        <p className="font-mono text-[11px] text-[var(--n-muted)]">1 job per payment · idempotency keys · retries explicit</p>
      </div>
    </Frame>
  );
}
