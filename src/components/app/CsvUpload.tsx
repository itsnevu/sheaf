"use client";

import { useCallback, useRef, useState } from "react";
import { Button, StatusBadge } from "@/components/ui";
import { CSV_LIMITS } from "@/lib/csv/parse";
import type { ValidationSummary } from "@/lib/csv/validate";
import { formatUnits } from "@/lib/money";

interface Props {
  assetSymbol: string;
  assetDecimals: number;
  onImport: (file: { fileName: string; text: string }) => Promise<void>;
  disabled?: boolean;
}

type Stage = "idle" | "reading" | "validating" | "preview" | "uploading";

export default function CsvUpload({ assetSymbol, assetDecimals, onImport, disabled }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<{ fileName: string; text: string; size: number } | null>(null);
  const [preview, setPreview] = useState<(ValidationSummary & { totalRows: number }) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = useCallback(
    async (f: File) => {
      setError(null);
      setPreview(null);
      if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") {
        setError(`"${f.name}" is not a .csv file. Export your sheet as CSV and try again.`);
        return;
      }
      if (f.size > CSV_LIMITS.maxBytes) {
        setError(`File is ${(f.size / 1024 / 1024).toFixed(1)} MB; the limit is ${CSV_LIMITS.maxBytes / 1024 / 1024} MB.`);
        return;
      }
      if (f.size === 0) {
        setError("The file is empty.");
        return;
      }
      setStage("reading");
      const text = await f.text();
      setFile({ fileName: f.name, text, size: f.size });
      setStage("validating");
      workerRef.current?.terminate();
      const w = new Worker(new URL("./csv.worker.ts", import.meta.url));
      workerRef.current = w;
      w.onmessage = (e: MessageEvent<{ ok: boolean; summary?: ValidationSummary; totalRows?: number; error?: string }>) => {
        if (e.data.ok && e.data.summary) {
          setPreview({ ...e.data.summary, totalRows: e.data.totalRows ?? e.data.summary.rows.length });
          setStage("preview");
        } else {
          setError(e.data.error ?? "Could not parse the file");
          setStage("idle");
        }
        w.terminate();
      };
      w.onerror = () => {
        setError("The validator crashed; try a smaller file.");
        setStage("idle");
      };
      w.postMessage({ text, opts: { assetSymbol, assetDecimals, largeAmountWarn: (50_000n * 10n ** BigInt(assetDecimals)).toString() } });
    },
    [assetSymbol, assetDecimals],
  );

  const commit = async () => {
    if (!file) return;
    setStage("uploading");
    try {
      await onImport({ fileName: file.fileName, text: file.text });
      reset();
    } catch (e) {
      setError((e as Error).message);
      setStage("preview");
    }
  };

  return (
    <div>
      {!file && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload CSV: drop a file here or press Enter to browse"
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !disabled && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f && !disabled) void handleFile(f);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-panel border-2 border-dashed px-6 py-12 text-center transition-colors ${drag ? "border-veil bg-veil-tint" : "border-line-strong bg-surface hover:border-ink-faint"} ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-field text-ink-soft">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
            </svg>
          </div>
          <div className="font-medium">Drop the contractor CSV here, or browse</div>
          <div className="mt-1 text-[0.8125rem] text-ink-faint">
            Columns: name, address, amount, optional asset and reference · up to {CSV_LIMITS.maxRows.toLocaleString()} rows, {CSV_LIMITS.maxBytes / 1024 / 1024} MB
          </div>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])} />
          {(stage === "reading" || stage === "validating") && <div className="mt-3 text-[0.8125rem] text-veil">{stage === "reading" ? "Reading file…" : "Validating rows…"}</div>}
        </div>
      )}
      {error && (
        <p className="error-text mt-3" role="alert">
          {error}
        </p>
      )}
      {file && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">{file.fileName}</div>
              <div className="text-[0.8125rem] text-ink-faint">{(file.size / 1024).toFixed(1)} KB{preview ? ` · ${preview.totalRows.toLocaleString()} rows · delimiter detected` : ""}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              Choose another file
            </Button>
          </div>
          {stage === "validating" && <p className="mt-4 text-[0.875rem] text-veil">Validating rows in the background…</p>}
          {preview && preview.fileErrors.length > 0 && (
            <div className="mt-4 rounded-card border border-danger/30 bg-danger-tint p-4 text-[0.875rem] text-danger" role="alert">
              <div className="font-medium">This file cannot be imported</div>
              <ul className="mt-1 list-disc pl-5">
                {preview.fileErrors.map((e) => (
                  <li key={e.code}>{e.message}</li>
                ))}
              </ul>
              {preview.header.length > 0 && <div className="mt-2 font-mono text-[0.75rem] opacity-80">Header found: {preview.header.join(", ")}</div>}
            </div>
          )}
          {preview && preview.fileErrors.length === 0 && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Valid rows" value={preview.validCount} tone={preview.validCount ? "success" : "neutral"} />
                <Stat label="Invalid rows" value={preview.invalidCount} tone={preview.invalidCount ? "danger" : "neutral"} />
                <Stat label="Duplicates" value={preview.duplicateAddresses} tone={preview.duplicateAddresses ? "warning" : "neutral"} />
                <Stat label="Valid total" value={`${formatUnits(preview.totalAmount, assetDecimals)} ${assetSymbol}`} tone="neutral" />
              </div>
              <div className="mt-4 text-[0.8125rem] text-ink-soft">
                Column mapping: {(["name", "address", "amount", "asset", "reference"] as const).map((c) => (
                  <span key={c} className="mr-3 inline-block">
                    <span className="font-mono">{c}</span> → {preview.columns[c] === null ? <span className="text-ink-faint">none</span> : <span className="font-medium">{preview.header[preview.columns[c]!]}</span>}
                  </span>
                ))}
              </div>
              <div className="table-wrap mt-4 max-h-64 overflow-y-auto rounded-card border border-line">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Address</th>
                      <th className="text-right">Amount</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 50).map((r) => (
                      <tr key={r.rowNumber}>
                        <td className="tnum text-ink-faint">{r.rowNumber}</td>
                        <td>{r.name || <span className="text-danger">empty</span>}</td>
                        <td className="mono-data max-w-[16rem] truncate">{r.addressInput || <span className="text-danger">empty</span>}</td>
                        <td className="text-right tnum">{r.amountInput}</td>
                        <td>{r.valid ? <StatusBadge tone="success">Valid</StatusBadge> : <span className="text-[0.8125rem] text-danger">{r.errors.map((e) => e.message).join("; ")}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 50 && <div className="px-3 py-2 text-[0.75rem] text-ink-faint">Showing the first 50 of {preview.totalRows.toLocaleString()} rows. All rows are imported and listed after import.</div>}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={commit} loading={stage === "uploading"}>
                  Import {preview.totalRows.toLocaleString()} rows
                </Button>
                <span className="text-[0.8125rem] text-ink-faint">Invalid rows are imported too, marked for correction. The server validates again.</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: "success" | "danger" | "warning" | "neutral" }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink";
  return (
    <div className="inset px-3 py-2.5">
      <div className="eyebrow">{label}</div>
      <div className={`mt-0.5 font-display text-[1.125rem] font-medium tnum ${color}`}>{value}</div>
    </div>
  );
}
