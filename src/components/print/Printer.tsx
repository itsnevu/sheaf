"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { findWork, missingWork, SERIES, WORK_NUMBERS, workToText, type Work } from "./receipts";
import { LOGICAL_WIDTH, renderWork } from "./render";

/**
 * The instrument. A grey printer that can be dragged around the sheet, two dials (SERIES and
 * WORK) that choose a page of Sheaf's story, a power button that prints it onto the black roll
 * one row at a time, blend buttons that change the ink, and a right-click menu to copy or save
 * the print. Sounds are synthesised, tiny, and only after the first click.
 */
const INKS = ["#f1f2f2", "#ff2e55", "#7c6cff"];
/** The roll keeps this many prints; the oldest is torn off when a new one arrives. */
const MAX_PRINTS = 8;
const OPTION_W = { series: 22, work: 27.6 };

function useClicks() {
  const ctx = useRef<AudioContext | null>(null);
  const armed = useRef(false);
  useEffect(() => {
    const arm = () => {
      armed.current = true;
    };
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, []);
  return useCallback((kind: "press" | "tick" | "done" | "dial") => {
    if (!armed.current) return;
    try {
      ctx.current ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const ac = ctx.current;
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      const f = kind === "press" ? 180 : kind === "tick" ? 1400 : kind === "done" ? 880 : 620;
      osc.type = kind === "tick" ? "square" : "triangle";
      osc.frequency.setValueAtTime(f, t);
      const vol = kind === "tick" ? 0.012 : 0.05;
      const dur = kind === "tick" ? 0.012 : kind === "done" ? 0.12 : 0.05;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur);
    } catch {
      // No audio: the printer stays silent.
    }
  }, []);
}

function Dial({ id, label, options, index, width, onChange }: { id: string; label: string; options: string[]; index: number; width: number; onChange: (next: number) => void }) {
  // The strip repeats the options three times so the dial can spin either way without a jump.
  const strip = [...options, ...options, ...options];
  const center = options.length + index;
  const offset = 47 / 2 - width / 2 - center * width;
  const start = useRef<number | null>(null);
  return (
    <div
      className="p-scroller"
      id={id}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={index}
      aria-valuetext={options[index]}
      aria-valuemin={0}
      aria-valuemax={options.length - 1}
      onPointerDown={(e) => {
        start.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (start.current === null) return;
        const dx = e.clientX - start.current;
        start.current = null;
        if (Math.abs(dx) > 8) onChange(dx < 0 ? index + 1 : index - 1);
        else {
          const rect = e.currentTarget.getBoundingClientRect();
          onChange(e.clientX - rect.left > rect.width / 2 ? index + 1 : index - 1);
        }
      }}
      onWheel={(e) => onChange(e.deltaY > 0 ? index + 1 : index - 1)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(index + 1);
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(index - 1);
      }}
    >
      <div className="p-scroller-options" style={{ transform: `translateX(${offset}px)` }}>
        {strip.map((o, i) => (
          <div key={i} className="p-scroller-option" style={{ width }}>
            {o}
          </div>
        ))}
      </div>
      <div className="p-scroller-overlay" />
    </div>
  );
}

function WidgetBody() {
  return (
    <svg className="p-widget-bg" viewBox="0 0 203 142" width="203" height="142" aria-hidden="true">
      <path d="M6.4 126.2V50.4c0-1.2-.5-2.4-1.3-3.2S3.1 45.8 1.9 45.7v85.2c1.2-.1 2.3-.6 3.2-1.5s1.3-2 1.3-3.2Z" fill="#c8c9ca" />
      <path d="M201.9 18.4v120.2c0 1.3-1 2.3-2.3 2.3H3.3c-1.3 0-2.3-1-2.3-2.3v-7.1c0-.3.3-.6.6-.6 2.6 0 4.7-2.1 4.7-4.7V50.4c0-2.6-2.1-4.7-4.7-4.7H1V3.3C1 2 2 1 3.3 1h181.1c9.6 0 17.5 7.8 17.5 17.4Z" fill="#e6e7e8" />
      <path d="M1.6 1.8h169.4M1 2.9h170M1 4h170M1 5.2h170M1 6.3h170M1 7.4h170M1 8.5h170M1 11.8h170M1 12.9h170M1 14.1h170M1 16.3h170M1 17.4h170M1 18.5h170M1 19.6h170M1 20.7h170M1 21.8h170M1 23h170M1 24.1h170M1 25.2h170M1 26.3h170M1 27.4h170M1 28.5h170M1 29.7h170M1 30.8h170" stroke="#d1d3d4" strokeWidth="0.25" />
      <path d="M170.98 1v30.5" stroke="#9fa1a3" strokeWidth="0.6" />
      <path d="M1 32.2h200.9" stroke="#9fa1a3" strokeWidth="0.6" />
      <g fill="#8a8c8e">
        {[8, 12, 16, 22, 26, 30, 36, 40, 46, 50, 54, 60, 64, 70, 74, 78, 84, 88, 94, 98].map((x, i) => (
          <circle key={i} cx={x} cy={i % 3 === 0 ? 10 : i % 3 === 1 ? 14 : 18} r="0.9" />
        ))}
        {[8, 14, 20, 26, 32, 40, 46, 54, 60, 66, 74, 80, 88, 94].map((x, i) => (
          <circle key={`b${i}`} cx={x} cy={i % 2 ? 22 : 26} r="0.9" />
        ))}
      </g>
      <path d="M1 138.6V45.7" stroke="#b7b9bb" strokeWidth="0.5" />
    </svg>
  );
}

/** Nothing prints until the power button is pressed, exactly like the reference instrument. */
export default function Printer({ pixelFont }: { pixelFont: string }) {
  const router = useRouter();
  const click = useClicks();
  const [seriesIdx, setSeriesIdx] = useState(0);
  const [workIdx, setWorkIdx] = useState(0);
  const [inkIdx, setInkIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [strips, setStrips] = useState<{ top: number; height: number; href?: string; code: string; title: string }[]>([]);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState("Ready.");
  const paperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rollRef = useRef<HTMLCanvasElement | null>(null); // full roll at logical resolution
  const printedRef = useRef<Work[]>([]);
  const heightsRef = useRef<number[]>([]); // logical height of each strip on the roll, oldest first
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const wrapSeries = (i: number) => ((i % SERIES.length) + SERIES.length) % SERIES.length;
  const wrapWork = (i: number) => ((i % WORK_NUMBERS.length) + WORK_NUMBERS.length) % WORK_NUMBERS.length;
  const series = SERIES[seriesIdx]!;

  /** Appends a work to the roll and reveals it row by row. */
  const print = useCallback(
    async (work: Work) => {
      if (busy) return;
      setBusy(true);
      setStatus(`Printing ${work.code} · ${work.title}`);
      click("press");
      const ink = INKS[inkIdx]!;
      try {
        await document.fonts.load(`16px ${pixelFont}`);
      } catch {
        // Fallback font is acceptable; the strip still prints.
      }
      const { canvas: strip, height } = await renderWork(work, ink, pixelFont);
      const roll = rollRef.current ?? document.createElement("canvas");
      let prevH = rollRef.current ? roll.height : 0;
      if (!rollRef.current) {
        roll.width = LOGICAL_WIDTH;
        roll.height = 0;
        rollRef.current = roll;
      }
      // Tear off the oldest print when the roll is full, so the canvas never grows without bound.
      let dropH = 0;
      if (printedRef.current.length >= MAX_PRINTS) {
        dropH = heightsRef.current.shift() ?? 0;
        printedRef.current.shift();
      }
      // Grow the roll, keeping what was already printed (minus the torn-off strip).
      const keepH = prevH - dropH;
      const keep = keepH > 0 ? roll.getContext("2d")!.getImageData(0, dropH, roll.width, keepH) : null;
      prevH = keepH;
      roll.height = prevH + height;
      const rctx = roll.getContext("2d")!;
      rctx.fillStyle = "#000";
      rctx.fillRect(0, 0, roll.width, roll.height);
      if (keep) rctx.putImageData(keep, 0, 0);
      rctx.drawImage(strip, 0, prevH);
      printedRef.current.push(work);
      heightsRef.current.push(height);
      if (dropH) setStrips((s) => s.slice(1).map((x) => ({ ...x, top: x.top - dropH })));
      setEmpty(false);

      const out = canvasRef.current!;
      out.width = LOGICAL_WIDTH;
      const octx = out.getContext("2d")!;
      octx.imageSmoothingEnabled = false;
      if (dropH) {
        out.height = prevH;
        octx.imageSmoothingEnabled = false;
        if (prevH > 0) octx.drawImage(roll, 0, 0, roll.width, prevH, 0, 0, roll.width, prevH);
      }
      const total = roll.height;
      const step = reducedMotion.current ? total : 4;
      let shown = prevH;
      await new Promise<void>((resolve) => {
        const frame = () => {
          shown = Math.min(total, shown + step);
          out.height = shown;
          octx.imageSmoothingEnabled = false;
          octx.drawImage(roll, 0, 0, roll.width, shown, 0, 0, roll.width, shown);
          if ((shown - prevH) % 24 < step) click("tick");
          if (shown < total) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      setStrips((s) => [...s, { top: prevH, height, href: work.href, code: work.code, title: work.title }]);
      click("done");
      setStatus(`Printed ${work.code}.`);
      setBusy(false);
    },
    [busy, click, inkIdx, pixelFont],
  );

  const printSelected = () => {
    const { series: s, work } = findWork(seriesIdx, workIdx);
    void print(work ?? missingWork(s, WORK_NUMBERS[workIdx]!));
  };

  // Dragging the printer around the sheet.
  const onWidgetPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, .p-scroller")) return;
    const el = widgetRef.current!;
    const rect = el.getBoundingClientRect();
    dragStart.current = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
    el.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onWidgetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragStart.current;
    if (!d) return;
    const el = widgetRef.current!;
    const left = Math.max(0, Math.min(window.innerWidth - 60, d.left + e.clientX - d.x));
    const top = Math.max(0, Math.min(window.innerHeight - 60, d.top + e.clientY - d.y));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.bottom = "auto";
  };
  const onWidgetPointerUp = () => {
    dragStart.current = null;
    setDragging(false);
  };

  // Context menu: copy the text of the whole roll or save it as an image.
  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("keydown", (e) => e.key === "Escape" && close());
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close);
    };
  }, []);
  const copyPrint = async () => {
    const text = printedRef.current.map(workToText).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Print copied as text.");
    } catch {
      setStatus("Clipboard unavailable.");
    }
    setCtxMenu(null);
  };
  const savePrint = () => {
    const roll = rollRef.current;
    if (!roll) return;
    // Save at 2× so the pixels stay crisp.
    const big = document.createElement("canvas");
    big.width = roll.width * 2;
    big.height = roll.height * 2;
    const c = big.getContext("2d")!;
    c.imageSmoothingEnabled = false;
    c.drawImage(roll, 0, 0, big.width, big.height);
    const a = document.createElement("a");
    a.href = big.toDataURL("image/png");
    a.download = `sheaf-print-${printedRef.current.map((w) => w.code).join("-") || "empty"}.png`;
    a.click();
    setStatus("Print saved.");
    setCtxMenu(null);
  };

  const scale = () => {
    const el = paperRef.current;
    return el ? el.clientWidth / LOGICAL_WIDTH : 2;
  };

  return (
    <>
      <div className="p-stage">
        <div
          ref={paperRef}
          className="p-paper"
          data-empty={empty}
          data-busy={busy}
          aria-label="Printed roll"
          onContextMenu={(e) => {
            if (empty) return;
            e.preventDefault();
            setCtxMenu({ x: e.clientX, y: e.clientY });
          }}
        >
          <span className="p-head" aria-hidden="true" />
          <canvas ref={canvasRef} width={LOGICAL_WIDTH} height={0} role="img" aria-label={strips.length ? `Printed: ${strips.map((s) => `${s.code} ${s.title}`).join("; ")}` : "Nothing printed yet"} />
          {strips.map((s) =>
            s.href ? (
              <a key={s.code + s.top} href={s.href} className="p-strip-link" style={{ top: s.top * scale(), height: s.height * scale() }} aria-label={`${s.title}: open ${s.href}`} onClick={(e) => { e.preventDefault(); router.push(s.href!); }} />
            ) : null,
          )}
        </div>
      </div>

      <div ref={widgetRef} className="p-widget" data-dragging={dragging} data-busy={busy} onPointerDown={onWidgetPointerDown} onPointerMove={onWidgetPointerMove} onPointerUp={onWidgetPointerUp} onPointerCancel={onWidgetPointerUp} role="group" aria-label="Printer">
        <WidgetBody />
        <span className="p-led" data-busy={busy} style={{ background: INKS[inkIdx], color: INKS[inkIdx] }} aria-hidden="true" />
        <div className="p-blends">
          <button type="button" className="p-blend" aria-label="Ink up" onClick={() => { click("dial"); setInkIdx((i) => (i + 1) % INKS.length); setStatus(`Ink ${(inkIdx + 1) % INKS.length + 1} of ${INKS.length}`); }} />
          <button type="button" className="p-blend" aria-label="Ink down" onClick={() => { click("dial"); setInkIdx((i) => (i - 1 + INKS.length) % INKS.length); }} />
        </div>
        <button type="button" className="p-print-btn" data-busy={busy} aria-label={`Print ${series.letter}-${WORK_NUMBERS[workIdx]}`} onClick={printSelected} disabled={busy}>
          <svg viewBox="0 0 31 32" fill="none" aria-hidden="true">
            <path d="M15.4 0v15.5" stroke={INKS[inkIdx]} strokeWidth="1.2" />
            <path d="M14.5 1.6C6.8 2.1 0.5 8.6 0.5 16.4c0 8.2 6.7 14.9 14.9 14.9s14.9-6.7 14.9-14.9c0-7.8-6.3-14.3-14.1-14.8" stroke={INKS[inkIdx]} strokeWidth="1.2" />
          </svg>
        </button>
        <div className="p-scrollers">
          <Dial id="scroller-series" label="Series" options={SERIES.map((s) => s.letter)} index={seriesIdx} width={OPTION_W.series} onChange={(n) => { click("dial"); setSeriesIdx(wrapSeries(n)); }} />
          <Dial id="scroller-work" label="Work" options={WORK_NUMBERS} index={workIdx} width={OPTION_W.work} onChange={(n) => { click("dial"); setWorkIdx(wrapWork(n)); }} />
        </div>
        <span className="p-dial-label" style={{ top: 48 }}>SERIES</span>
        <span className="p-dial-label" style={{ top: 96 }}>WORK</span>
      </div>

      <div className="p-context" data-open={!!ctxMenu} style={ctxMenu ? { left: Math.min(ctxMenu.x, window.innerWidth - 110), top: Math.min(ctxMenu.y, window.innerHeight - 80) } : undefined} role="menu">
        <button type="button" role="menuitem" onClick={copyPrint}>Copy Print</button>
        <button type="button" role="menuitem" onClick={savePrint}>Save Print</button>
      </div>

      <p className="p-note">
        {series.letter}_{WORK_NUMBERS[workIdx]} · {series.name} · <a href="/sign-in">SIGN IN</a>
      </p>
      <span className="sr-only" role="status" aria-live="polite">{status}</span>
    </>
  );
}
