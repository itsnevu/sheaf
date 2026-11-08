"use client";

import { useState } from "react";

export default function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* */ }
  };

  return (
    <div className="card overflow-hidden">
      {title && (
        <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
          <span className="font-mono text-xs text-faint">{title}</span>
          <button type="button" onClick={copy} className="font-mono text-xs text-signal hover:text-signal-strong transition-colors">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono text-fg leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
