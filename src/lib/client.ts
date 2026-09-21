"use client";

/** Tiny fetch wrapper for API calls from client components. Throws Error(message) on non-2xx. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(path, { ...init, headers, body, credentials: "same-origin" });
  const ct = res.headers.get("content-type") ?? "";
  const data = ct.includes("application/json") ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const msg = (data && typeof data === "object" && "error" in data && (data as { error: string }).error) || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, (data as { code?: string })?.code);
  }
  return data as T;
}

export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", opts);
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d} d ago`;
  return fmtDate(iso, { day: "numeric", month: "short" });
}

export function downloadUrl(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
