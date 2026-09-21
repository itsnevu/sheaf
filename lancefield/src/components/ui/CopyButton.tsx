"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy", copiedLabel = "Copied", className = "", size = "sm" }: { text: string; label?: string; copiedLabel?: string; className?: string; size?: "sm" | "md" }) {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      className={`btn btn-secondary ${size === "sm" ? "btn-sm" : ""} ${className}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setFailed(false);
          setTimeout(() => setDone(false), 1800);
        } catch {
          setFailed(true);
        }
      }}
      aria-live="polite"
    >
      {failed ? "Select and copy manually" : done ? copiedLabel : label}
    </button>
  );
}
