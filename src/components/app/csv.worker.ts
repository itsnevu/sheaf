/// <reference lib="webworker" />
import { validateCsvText, type ValidationOptions } from "@/lib/csv/validate";

/** Parses and validates a CSV off the main thread so large files never freeze the UI. */
self.onmessage = (e: MessageEvent<{ text: string; opts: ValidationOptions & { largeAmountWarn?: string } }>) => {
  const { text, opts } = e.data;
  try {
    const summary = validateCsvText(text, { ...opts, largeAmountWarn: opts.largeAmountWarn ? BigInt(opts.largeAmountWarn) : undefined });
    // Only send the preview the UI needs; the server re-validates the full text.
    (self as unknown as Worker).postMessage({ ok: true, summary: { ...summary, rows: summary.rows.slice(0, 5000) }, totalRows: summary.rows.length });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: (err as Error).message });
  }
};
