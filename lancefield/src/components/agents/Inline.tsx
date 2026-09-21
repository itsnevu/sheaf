import Link from "next/link";
import type { ReactNode } from "react";

/** Renders the small inline subset of markdown the guide uses: `code`, **strong** and [text](href). */
const TOKEN = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

export function Inline({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const t = m[0];
    if (t.startsWith("`")) out.push(<code key={key++}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("**")) out.push(<strong key={key++}>{t.slice(2, -2)}</strong>);
    else {
      const link = LINK.exec(t);
      if (link) out.push(<Link key={key++} href={link[2]}>{link[1]}</Link>);
      else out.push(t);
    }
    last = at + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
