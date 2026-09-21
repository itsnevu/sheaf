"use client";

import { useEffect, useState } from "react";

/** "Scroll to see how it works" with three cascading chevrons; hides once the reader scrolls. */
export default function ScrollCue() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const on = () => setHidden(window.scrollY > window.innerHeight * 0.6);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className="n-cue" style={{ opacity: hidden ? 0 : 1 }} aria-hidden="true">
      <p className="n-label mb-2 text-white/90">Scroll to see how it works</p>
      <div className="n-cue-svgs">
        {[0, 1, 2].map((i) => (
          <span key={i}>
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="#ff2e55" strokeWidth="2">
              <path d="M1 1l6 6 6-6" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
