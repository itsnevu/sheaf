/** Browser-side fetch helper: JSON in, JSON out, errors surfaced with the API's message. */
export async function api<T = unknown>(url: string, init?: { method?: string; json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.json ? "POST" : "GET"),
    headers: init?.json ? { "content-type": "application/json" } : undefined,
    body: init?.json ? JSON.stringify(init.json) : undefined,
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: { code: string; message: string } } & T;
  if (!res.ok || data.ok === false) throw new ApiError(data.error?.message ?? `Request failed (${res.status})`, data.error?.code ?? "error", res.status);
  return data;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
