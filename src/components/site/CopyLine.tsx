"use client";

import { useState } from "react";

/** Copies a line of text (the CSV header) to the clipboard with a short confirmation. */
export default function CopyLine({ text, label = "Copy header" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="n-btn-wrap"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard unavailable: the text is visible next to the button */
        }
      }}
      aria-live="polite"
    >
      <span className="n-btn-halo" aria-hidden="true" />
      <span className="n-btn">{done ? "Copied" : label}</span>
    </button>
  );
}
