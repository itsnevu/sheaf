"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ROLLS, type Roll } from "./rolls";

/**
 * The reader: a handheld with a paper window on the left and, on the right, a speed slider,
 * five buttons and the brand. The paper scrolls by itself; the slider sets speed and direction,
 * NEXT / PREV change the roll, SPD UP / SPD DOWN nudge the slider, AUTO PLAY starts and stops.
 */
const W = 613;
const H = 899;
const PAGE = { x: 15, y: 30, w: 391, h: 839 };
const SCALE2 = 2; // canvas resolution
const LINE_H = 22; // logical px at 2×
const FONT_PX = 19;

function useClick() {
  const ctx = useRef<AudioContext | null>(null);
  const armed = useRef(false);
  useEffect(() => {
    const arm = () => (armed.current = true);
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, []);
  return useCallback((down: boolean) => {
    if (!armed.current) return;
    try {
      ctx.current ??= new AudioContext();
      const ac = ctx.current;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g);
      g.connect(ac.destination);
      o.type = "triangle";
      o.frequency.setValueAtTime(down ? 220 : 330, t);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.start(t);
      o.stop(t + 0.05);
    } catch {
      // silent
    }
  }, []);
}

function renderRoll(roll: Roll, font: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = PAGE.w * SCALE2;
  const pad = 40;
  const top = 60;
  c.height = Math.max(PAGE.h * SCALE2, top + roll.lines.length * LINE_H + 400);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f2f2f0";
  ctx.fillRect(0, 0, c.width, c.height);
  // Paper grain
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  let seed = 7;
  for (let i = 0; i < d.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const n = ((seed >> 16) & 15) - 7;
    d[i] = Math.max(0, Math.min(255, d[i]! + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + n));
  }
  ctx.putImageData(img, 0, 0);
  ctx.font = `${FONT_PX}px ${font}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#151515";
  roll.lines.forEach((line, i) => {
    // Typewriter unevenness: a little jitter per glyph row and slightly heavier caps.
    const y = top + i * LINE_H + ((i * 7) % 3) - 1;
    ctx.globalAlpha = 0.86 + ((i * 13) % 5) * 0.03;
    ctx.fillText(line, pad, y);
  });
  ctx.globalAlpha = 1;
  return c;
}

export default function Reader({ rolls = ROLLS, typeFont, labelFont }: { rolls?: Roll[]; typeFont: string; labelFont: string }) {
  const click = useClick();
  const [idx, setIdx] = useState(0);
  const [speed, setSpeed] = useState(1); // -5..5 logical, slider position
  const [auto, setAuto] = useState(true);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rollRef = useRef<HTMLCanvasElement | null>(null);
  const offset = useRef(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const roll = rolls[idx]!;

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 24) / W, (window.innerHeight - 24) / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    let alive = true;
    document.fonts
      .load(`${FONT_PX}px ${typeFont}`)
      .catch(() => undefined)
      .then(() => {
        if (!alive) return;
        rollRef.current = renderRoll(roll, typeFont);
        offset.current = 0;
      });
    return () => {
      alive = false;
    };
  }, [roll, typeFont]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const out = canvasRef.current;
      const src = rollRef.current;
      if (out && src) {
        const maxOff = Math.max(0, src.height - PAGE.h * SCALE2);
        if (auto && !reduced) offset.current += (speed * 26 * dt) / 1000;
        if (offset.current > maxOff) offset.current = 0;
        if (offset.current < 0) offset.current = maxOff;
        const ctx = out.getContext("2d")!;
        ctx.drawImage(src, 0, offset.current, src.width, PAGE.h * SCALE2, 0, 0, out.width, out.height);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [auto, speed]);

  const setFromPointer = (clientY: number) => {
    const el = sliderRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = (clientY - r.top) / r.height; // 0 top .. 1 bottom
    const v = Math.round((0.5 - t) * 10); // +5 top .. -5 bottom
    setSpeed(Math.max(-5, Math.min(5, v)));
  };

  const btn = (label: string, aria: string, onClick: () => void, extra = "", icon: React.ReactNode) => (
    <button
      type="button"
      className={`r-button ${extra}`}
      aria-label={aria}
      onPointerDown={() => click(true)}
      onClick={() => {
        click(false);
        onClick();
      }}
    >
      <span className="r-button-face">{icon}</span>
      <span className="r-button-label" style={{ fontFamily: labelFont }}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="r-container">
      <div className="r-scaler" style={{ width: W * scale, height: H * scale }}>
      <div className="r-device" style={{ transform: `scale(${scale})` }} role="group" aria-label="Documentation reader">
        <div className="r-body" />
        <div className="r-page" style={{ left: PAGE.x, top: PAGE.y, width: PAGE.w, height: PAGE.h }}>
          <canvas ref={canvasRef} width={PAGE.w * SCALE2} height={PAGE.h * SCALE2} role="img" aria-label={`Roll ${roll.code}: ${roll.title}`} />
          <div className="r-page-shadow" />
          <div className="r-roller r-roller-top" />
          <div className="r-roller r-roller-bottom" />
        </div>
        <div className="r-panel" />
        <div className="r-track" aria-hidden="true">
          {[5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5].map((n, i) => (
            <span key={i} className="r-tick" style={{ top: `${(i / 10) * 100}%`, fontFamily: labelFont }}>
              {n}
            </span>
          ))}
          <span className="r-track-line" />
        </div>
        <div
          ref={sliderRef}
          className="r-slider"
          role="slider"
          aria-label="Speed"
          aria-valuemin={-5}
          aria-valuemax={5}
          aria-valuenow={speed}
          tabIndex={0}
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as Element).setPointerCapture?.(e.pointerId);
            setFromPointer(e.clientY);
          }}
          onPointerMove={(e) => dragging.current && setFromPointer(e.clientY)}
          onPointerUp={() => (dragging.current = false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") setSpeed((s) => Math.min(5, s + 1));
            if (e.key === "ArrowDown") setSpeed((s) => Math.max(-5, s - 1));
          }}
        >
          <span className="r-thumb" style={{ top: `${(0.5 - speed / 10) * 100}%` }} />
        </div>
        <div className="r-brand" style={{ fontFamily: labelFont }}>
          <span>SHEAF</span>
          <span className="r-brand-strike">Q-MASTER</span>
          <sup>TM</sup>
        </div>
        <div className="r-buttons">
          {btn("NEXT ROLL", "Next roll", () => setIdx((i) => (i + 1) % rolls.length), "", <span>&gt;|</span>)}
          {btn("PREV ROLL", "Previous roll", () => setIdx((i) => (i - 1 + rolls.length) % rolls.length), "", <span>|&lt;</span>)}
          {btn("SPD UP", "Speed up", () => setSpeed((s) => Math.min(5, s + 1)), "", <span>&raquo;</span>)}
          {btn("SPD DOWN", "Speed down", () => setSpeed((s) => Math.max(-5, s - 1)), "", <span>&laquo;</span>)}
          {btn("AUTO PLAY", auto ? "Stop auto play" : "Start auto play", () => setAuto((a) => !a), `r-button-red ${auto ? "is-on" : ""}`, <span className="r-auto-icon">&#8635;</span>)}
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          Roll {roll.code} {roll.title}. Speed {speed}. Auto play {auto ? "on" : "off"}.
        </span>
      </div>
      </div>
      <p className="r-note" style={{ fontFamily: labelFont }}>
        ROLL {roll.code} / {String(rolls.length).padStart(2, "0")} · {roll.title.toUpperCase()}
      </p>
    </div>
  );
}
