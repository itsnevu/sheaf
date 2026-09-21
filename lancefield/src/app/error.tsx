"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Mark } from "@/components/brand/Logo";

/** Route error boundary: keeps the brand and a way back when a page throws. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page]", error);
  }, [error]);
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <Mark size={40} />
      <p className="t-eyebrow mt-6">Something went wrong</p>
      <h1 className="t-display-md mt-3 text-ink">The field could not be read.</h1>
      <p className="t-body mt-3 max-w-md">Nothing is lost. Try again, or go back to the start. If it keeps happening, the database behind this site is not answering.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/" className="btn btn-secondary">
          Go home
        </Link>
      </div>
      {error.digest && <p className="mt-6 font-mono text-xs text-ink-faint">ref {error.digest}</p>}
    </div>
  );
}
