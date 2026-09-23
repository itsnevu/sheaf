"use client";

import { Money, StatusBadge, IconWarn } from "@/components/ui";
import { chainName } from "@/lib/config";
import { operationKindLabel } from "@/lib/domain/states";
import { toDisplayUsd } from "@/lib/money";
import type { BatchDetail } from "./useBatch";

/** The pre-approval review. Every estimate is labelled; unavailable is shown as unavailable. */
export default function ReviewPanel({ d }: { d: BatchDetail }) {
  const { batch, summary, recipients } = d;
  const now = Date.now();
  const stale = recipients.filter((r) => r.route?.status === "QUOTED" && r.route.expiresAt && new Date(r.route.expiresAt).getTime() < now).length;
  const warnings: string[] = [];
  if (summary.invalid > 0) warnings.push(`${summary.invalid} invalid leg(s) must be corrected or removed.`);
  if (summary.routeUnavailable > 0) warnings.push(`${summary.routeUnavailable} leg(s) have no available route. Prepare routes again or remove them.`);
  if (stale > 0) warnings.push(`${stale} route quote(s) have expired. Prepare routes again before approval.`);
  if (summary.directTransferRoutes > 0) warnings.push(`${summary.directTransferRoutes} route(s) are direct token transfers from the desk wallet (same chain, same asset). The desk wallet is then the visible sender of that leg.`);
  const largeWarn = recipients.filter((r) => r.warnings.some((w) => w.code === "AMOUNT_LARGE")).length;
  if (largeWarn) warnings.push(`${largeWarn} unusually large amount(s) flagged; double-check them.`);
  if (batch.deadlineAt && new Date(batch.deadlineAt).getTime() < now) warnings.push("The operation deadline has passed.");

  return (
    <div className="space-y-5">
      <dl className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Item k="Operation" v={batch.name} sub={`${operationKindLabel(batch.kind)}${batch.reference ? ` · ${batch.reference}` : ""}`} />
        <Item k="Legs" v={`${summary.valid} valid`} sub={summary.invalid ? `${summary.invalid} invalid` : "0 invalid"} tone={summary.invalid ? "danger" : undefined} />
        <Item k="Total amount" v={<Money units={batch.totalAmount} decimals={batch.assetDecimals} symbol={batch.assetSymbol} />} sub="exact, from valid legs" />
        <Item k="Asset · network" v={`${batch.assetSymbol} · ${chainName(batch.destinationChainId)}`} sub={batch.originChainId !== batch.destinationChainId ? `funded from ${chainName(batch.originChainId)}` : "same-chain routes"} />
        <Item k="Estimated network + routing fees" v={summary.feesComplete && summary.feeEstimateUsd !== null ? toDisplayUsd(summary.feeEstimateUsd) : <span className="text-warning">Unavailable</span>} sub={summary.feesComplete ? "estimate at quote time; actual fees are computed at fill" : "some routes have no quote"} />
        <Item k="Estimated total funding requirement" v={summary.feesComplete && summary.fundingRequired ? <Money units={summary.fundingRequired} decimals={batch.assetDecimals} symbol={batch.assetSymbol} /> : <span className="text-warning">Unavailable</span>} sub="origin-chain amount incl. routing fees; gas is paid in the native asset" />
        <Item k="Route readiness" v={`${summary.routed}/${summary.valid} ready`} sub={summary.routeUnavailable ? `${summary.routeUnavailable} unavailable` : stale ? `${stale} expired` : "all quoted"} tone={summary.routeUnavailable || stale ? "warning" : "success"} />
        <Item k="Mode" v={batch.mode === "demo" ? <StatusBadge tone="warning">Demo · simulated</StatusBadge> : <StatusBadge tone="progress">Real</StatusBadge>} sub={batch.jitterMaxSeconds ? `spacing up to ${Math.round(batch.jitterMaxSeconds / 60)} min` : "no spacing"} />
      </dl>

      {warnings.length > 0 ? (
        <div className="rounded-card border border-warning/30 bg-warning-tint p-4" role="alert">
          <div className="flex items-center gap-2 font-medium text-warning">
            <IconWarn /> Unresolved warnings
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.875rem] text-warning">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-card border border-success/30 bg-success-tint p-4 text-[0.875rem] text-success">No unresolved warnings. Every leg has a fresh route and a fee estimate.</div>
      )}

      <div className="table-wrap rounded-card border border-line">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Leg</th>
              <th className="text-right">Amount</th>
              <th>Route</th>
              <th className="text-right">Est. fee</th>
              <th className="text-right">Sends</th>
            </tr>
          </thead>
          <tbody>
            {recipients
              .filter((r) => r.valid)
              .map((r) => (
                <tr key={r.id}>
                  <td className="tnum text-ink-faint">{r.rowNumber}</td>
                  <td>
                    <div className="font-medium">{r.name}</div>
                    <div className="mono-data text-ink-faint">{r.address}</div>
                  </td>
                  <td className="text-right">
                    <Money units={r.amount} decimals={batch.assetDecimals} />
                  </td>
                  <td>
                    {r.route?.status === "QUOTED" ? (
                      <StatusBadge status="ROUTED">{r.route.routeKind === "direct_transfer" ? "Direct transfer" : r.route.routeKind === "swap" ? "Swap" : "Cross-chain"}</StatusBadge>
                    ) : (
                      <StatusBadge status={r.route?.status === "UNAVAILABLE" ? "ROUTE_UNAVAILABLE" : r.route?.status ?? "PENDING"} />
                    )}
                  </td>
                  <td className="text-right tnum">{r.route?.status === "QUOTED" ? toDisplayUsd(r.route.feeTotalUsd) : <span className="text-warning">unavailable</span>}</td>
                  <td className="text-right">{r.route?.status === "QUOTED" ? <Money units={r.route.amountIn} decimals={batch.assetDecimals} /> : "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Item({ k, v, sub, tone }: { k: string; v: React.ReactNode; sub?: string; tone?: "danger" | "warning" | "success" }) {
  const color = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-ink-faint";
  return (
    <div className="bg-surface px-4 py-3.5">
      <dt className="eyebrow">{k}</dt>
      <dd className="mt-1 font-display text-[1.0625rem] font-medium leading-snug tnum">{v}</dd>
      {sub && <dd className={`mt-0.5 text-[0.75rem] ${color}`}>{sub}</dd>}
    </div>
  );
}
