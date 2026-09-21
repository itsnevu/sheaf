/** Display helpers used by pages and components. */

export function shortWallet(w: string | null | undefined, head = 6, tail = 4): string {
  if (!w) return "—";
  return w.length > head + tail + 2 ? `${w.slice(0, head)}…${w.slice(-tail)}` : w;
}

export function fmtDate(d: Date | string | null | undefined, withTime = false): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}

/** "3 days left", "5 hours left", "closed 2 days ago". */
export function timeLeft(closesAt: Date | string, now = new Date()): { label: string; over: boolean; ms: number } {
  const t = typeof closesAt === "string" ? new Date(closesAt) : closesAt;
  const ms = t.getTime() - now.getTime();
  const abs = Math.abs(ms);
  const unit = abs >= 86_400_000 ? [Math.round(abs / 86_400_000), "day"] : abs >= 3_600_000 ? [Math.round(abs / 3_600_000), "hour"] : [Math.max(1, Math.round(abs / 60_000)), "minute"];
  const n = unit[0] as number;
  const word = `${n} ${unit[1]}${n === 1 ? "" : "s"}`;
  return ms > 0 ? { label: `${word} left`, over: false, ms } : { label: `closed ${word} ago`, over: true, ms };
}

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}
