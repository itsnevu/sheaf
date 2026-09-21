"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Tone = "neutral" | "success" | "danger";
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}
const Ctx = createContext<{ toast: (message: string, tone?: Tone) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((message: string, tone: Tone = "neutral") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, message, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto max-w-md rounded-md border px-4 py-2.5 text-sm shadow-lift animate-fade-up ${t.tone === "success" ? "border-moss/30 bg-moss text-white" : t.tone === "danger" ? "border-clay/40 bg-clay text-white" : "border-line bg-ink text-paper"}`} role="status">
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx;
}
