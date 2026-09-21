"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Tone = "neutral" | "success" | "danger" | "warning";
interface Toast {
  id: number;
  title: string;
  detail?: string;
  tone: Tone;
}
interface Ctx {
  toast: (title: string, opts?: { detail?: string; tone?: Tone }) => void;
}
const ToastCtx = createContext<Ctx>({ toast: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const toast = useCallback<Ctx["toast"]>((title, opts) => {
    const id = ++seq.current;
    setItems((s) => [...s, { id, title, detail: opts?.detail, tone: opts?.tone ?? "neutral" }].slice(-4));
    window.setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), opts?.tone === "danger" ? 7000 : 4200);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  const tones: Record<Tone, string> = {
    neutral: "border-line bg-surface text-ink",
    success: "border-success/30 bg-success-tint text-success",
    danger: "border-danger/30 bg-danger-tint text-danger",
    warning: "border-warning/30 bg-warning-tint text-warning",
  };
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:px-0">
        {items.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto w-full max-w-sm rounded-card border px-4 py-3 shadow-lifted animate-fade-up ${tones[t.tone]}`}>
            <div className="text-[0.9rem] font-medium">{t.title}</div>
            {t.detail && <div className="mt-0.5 text-[0.8125rem] opacity-80">{t.detail}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
