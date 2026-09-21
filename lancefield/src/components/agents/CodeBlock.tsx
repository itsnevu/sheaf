import { CopyButton } from "@/components/ui/CopyButton";

/** A code sample with a label and a copy button. Works inside and outside .prose-lf. */
export function CodeBlock({ code, lang, label, className = "" }: { code: string; lang: string; label?: string; className?: string }) {
  return (
    <figure className={`mt-4 overflow-hidden rounded-md bg-ink text-paper ${className}`}>
      <figcaption className="flex items-center justify-between gap-3 border-b border-paper/10 px-4 py-2">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-paper/60">{label ?? lang}</span>
        <CopyButton text={code} label="Copy" copiedLabel="Copied" className="!border-paper/25 !bg-transparent !text-paper hover:!border-paper hover:!bg-paper/10" />
      </figcaption>
      <pre className="!mt-0 overflow-x-auto !rounded-none bg-transparent p-4 font-mono text-[0.8125rem] leading-relaxed text-paper" tabIndex={0} aria-label={label ? `${label} code sample` : "Code sample"}>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
