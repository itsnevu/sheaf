"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ROLLS, type Roll } from "./rolls";

/**
 * The reader: a handheld with a paper window on the left and, on the right, a speed slider,
 * five buttons and the brand. The paper scrolls by itself; the slider sets speed and direction,
 * NEXT / PREV change the roll (the paper spools back first), SPD UP / SPD DOWN nudge the slider,
 * AUTO PLAY starts and stops. The paper can also be dragged, flicked or wheeled by hand; the
 * device tilts under the mouse; a small LCD shows the state; the rollers turn with the paper.
 */
const W = 613;
const H = 899;
const PAGE = { x: 15, y: 30, w: 391, h: 839 };
const SCALE2 = 2; // canvas resolution
const LINE_H = 22; // logical px at 2×
const FONT_PX = 19;
const REWIND_MS = 460;
const TILT_DEG = 7;
const CHARS_PER_SEC = 170; // typing speed of a fresh roll
const PAD = 40;
const TOP = 60;

type SoundKind = "down" | "up" | "tick" | "spool" | "key" | "ret";

function useSound() {
  const ctx = useRef<AudioContext | null>(null);
  const armed = useRef(false);
  useEffect(() => {
    const arm = () => (armed.current = true);
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, []);
  return useCallback((kind: SoundKind) => {
    if (!armed.current) return;
    try {
      ctx.current ??= new AudioContext();
      const ac = ctx.current;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g);
      g.connect(ac.destination);
      const spec: Record<SoundKind, [OscillatorType, number, number, number]> = {
        down: ["triangle", 220, 0.04, 0.05],
        up: ["triangle", 330, 0.04, 0.05],
        tick: ["square", 1900, 0.006, 0.008],
        spool: ["sawtooth", 140, 0.02, 0.36],
        key: ["square", 2400, 0.009, 0.012],
        ret: ["triangle", 640, 0.03, 0.09],
      };
      const [type, f, vol, dur] = spec[kind];
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (kind === "spool") o.frequency.exponentialRampToValueAtTime(460, t + 0.3);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur);
    } catch {
      // silent
    }
  }, []);
}

/** Blank paper with grain, tall enough for the roll. */
function renderPaper(roll: Roll): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = PAGE.w * SCALE2;
  c.height = Math.max(PAGE.h * SCALE2, TOP + roll.lines.length * LINE_H + 400);
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
  return c;
}

/** Types the first `chars` characters of the roll onto a copy of the paper, with the carriage. */
function typeRoll(out: HTMLCanvasElement, paper: HTMLCanvasElement, roll: Roll, font: string, chars: number, cursorOn: boolean): void {
  const ctx = out.getContext("2d")!;
  ctx.drawImage(paper, 0, 0);
  ctx.font = `${FONT_PX}px ${font}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#151515";
  let left = chars;
  let cx = PAD;
  let cy = TOP;
  for (let i = 0; i < roll.lines.length && left > 0; i++) {
    const line = roll.lines[i]!;
    // Typewriter unevenness: a little jitter per glyph row and slightly heavier caps.
    const y = TOP + i * LINE_H + ((i * 7) % 3) - 1;
    ctx.globalAlpha = 0.86 + ((i * 13) % 5) * 0.03;
    const n = Math.min(line.length, Math.floor(left));
    const shown = line.slice(0, n);
    ctx.fillText(shown, PAD, y);
    left -= line.length + 1;
    cx = PAD + ctx.measureText(shown).width;
    cy = y;
  }
  ctx.globalAlpha = 1;
  if (cursorOn) {
    ctx.fillStyle = "rgba(21,21,21,0.7)";
    ctx.fillRect(cx + 2, cy + 1, 10, LINE_H - 4);
  }
}

function rollChars(roll: Roll): number {
  return roll.lines.reduce((n, l) => n + l.length + 1, 0);
}

interface Motion {
  offset: number;
  vel: number; // px per frame after a flick
  speed: number;
  auto: number; // 1 or 0
  rewind: { from: number; t0: number } | null;
  grab: { y: number; t: number } | null;
  line: number;
  lastTick: number;
  tiltX: number;
  tiltY: number;
  tx: number;
  ty: number;
  typed: number;
  total: number;
  lastKey: number;
  keyLine: number;
}

export default function Reader({ rolls = ROLLS, typeFont, labelFont }: { rolls?: Roll[]; typeFont: string; labelFont: string }) {
  const sound = useSound();
  const [idx, setIdx] = useState(0);
  const [speed, setSpeed] = useState(1); // -5..5, slider position
  const [auto, setAuto] = useState(true);
  const [scale, setScale] = useState(1);
  const [pressed, setPressed] = useState<string | null>(null);
  const [sliderDrag, setSliderDrag] = useState(false);
  const [grab, setGrab] = useState(false);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rollRef = useRef<HTMLCanvasElement | null>(null);
  const paperRef = useRef<HTMLCanvasElement | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const firstRoll = useRef(true);
  const m = useRef<Motion>({ offset: 0, vel: 0, speed: 1, auto: 1, rewind: null, grab: null, line: 0, lastTick: 0, tiltX: 0, tiltY: 0, tx: 0, ty: 0, typed: 0, total: 0, lastKey: 0, keyLine: 0 });
  const roll = rolls[idx]!;

  useEffect(() => {
    m.current.speed = speed;
    m.current.auto = auto ? 1 : 0;
  }, [speed, auto]);

  useEffect(() => {
    const fit = () => {
      const s = Math.min(1, (window.innerWidth - 24) / W, (window.innerHeight - 24) / H);
      scaleRef.current = s;
      setScale(s);
    };
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
        const paper = renderPaper(roll);
        const c = document.createElement("canvas");
        c.width = paper.width;
        c.height = paper.height;
        paperRef.current = paper;
        rollRef.current = c;
        const s = m.current;
        s.total = rollChars(roll);
        s.typed = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? s.total : 0;
        s.keyLine = 0;
        typeRoll(c, paper, roll, typeFont, s.typed, s.typed < s.total);
        if (firstRoll.current) {
          firstRoll.current = false;
          s.offset = 0;
        } else {
          // Spool back to the start of the new roll from wherever the paper was.
          s.rewind = { from: s.offset, t0: performance.now() };
          s.vel = 0;
          sound("spool");
        }
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [roll, typeFont, sound]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const s = m.current;
      const out = canvasRef.current;
      const src = rollRef.current;
      const paper = paperRef.current;
      if (src && paper && s.typed < s.total) {
        // The roll types itself in; keys clack, the carriage returns at line ends.
        const before = Math.floor(s.typed);
        s.typed = Math.min(s.total, s.typed + (dt * CHARS_PER_SEC) / 1000);
        const after = Math.floor(s.typed);
        typeRoll(src, paper, roll, typeFont, s.typed, s.typed >= s.total ? false : Math.floor(now / 400) % 2 === 0);
        if (after > before && now - s.lastKey > 45) {
          s.lastKey = now;
          sound("key");
        }
        let acc = 0;
        let ln = 0;
        for (const l of roll.lines) {
          acc += l.length + 1;
          if (acc > s.typed) break;
          ln++;
        }
        if (ln > s.keyLine) {
          s.keyLine = ln;
          if (roll.lines[ln - 1]?.length) sound("ret");
        }
      } else if (src && paper && s.typed >= s.total && s.keyLine >= 0) {
        // Final pass without the carriage block.
        typeRoll(src, paper, roll, typeFont, s.total, false);
        s.keyLine = -1;
      }
      if (out && src) {
        const maxOff = Math.max(0, src.height - PAGE.h * SCALE2);
        const before = s.offset;
        if (s.rewind) {
          const p = Math.min(1, (now - s.rewind.t0) / (reduced ? 1 : REWIND_MS));
          const e = 1 - Math.pow(1 - p, 3);
          s.offset = Math.min(maxOff, s.rewind.from) * (1 - e);
          if (p >= 1) {
            s.rewind = null;
            s.offset = 0;
          }
        } else if (!s.grab) {
          if (Math.abs(s.vel) > 0.15) {
            s.offset += (s.vel * dt) / 16;
            s.vel *= Math.pow(0.93, dt / 16);
          } else s.vel = 0;
          if (s.auto && !reduced) s.offset += (s.speed * 26 * dt) / 1000;
        }
        if (s.offset > maxOff) s.offset = 0;
        if (s.offset < 0) s.offset = maxOff;
        let v = s.offset - before;
        if (Math.abs(v) > 300) v = 0; // a wrap, not motion
        const ctx = out.getContext("2d")!;
        ctx.globalAlpha = 1;
        ctx.drawImage(src, 0, s.offset, src.width, PAGE.h * SCALE2, 0, 0, out.width, out.height);
        const av = Math.abs(v);
        if (av > 2.5 && !reduced) {
          // Motion blur: two ghost copies along the direction of travel.
          ctx.globalAlpha = Math.min(0.42, av / 32);
          ctx.drawImage(src, 0, s.offset - v * 0.6, src.width, PAGE.h * SCALE2, 0, 0, out.width, out.height);
          ctx.drawImage(src, 0, s.offset + v * 0.6, src.width, PAGE.h * SCALE2, 0, 0, out.width, out.height);
          ctx.globalAlpha = 1;
        }
        const line = Math.floor(s.offset / LINE_H);
        if (line !== s.line) {
          s.line = line;
          if (av > 0 && now - s.lastTick > 70) {
            s.lastTick = now;
            sound("tick");
          }
        }
      }
      const t = tiltRef.current;
      if (t) {
        s.tiltX += (s.tx - s.tiltX) * 0.09;
        s.tiltY += (s.ty - s.tiltY) * 0.09;
        t.style.transform = `rotateX(${s.tiltX.toFixed(2)}deg) rotateY(${s.tiltY.toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [sound, roll, typeFont]);

  const go = useCallback((delta: number) => setIdx((i) => (i + delta + rolls.length) % rolls.length), [rolls.length]);
  const nudge = useCallback((delta: number) => setSpeed((s) => Math.max(-5, Math.min(5, s + delta))), []);

  // Keyboard: arrows change roll and speed, space toggles auto play.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, a, [contenteditable]")) return;
      if (el.closest("[role=slider]") && (e.key === "ArrowUp" || e.key === "ArrowDown")) return; // the slider handles those
      if (el.closest("button") && (e.key === " " || e.key === "Enter")) return; // the button handles those
      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      else if (e.key === "ArrowUp") nudge(1);
      else if (e.key === "ArrowDown") nudge(-1);
      else if (e.key === " ") setAuto((a) => !a);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, nudge]);

  const setFromPointer = (clientY: number) => {
    const el = sliderRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = (clientY - r.top) / r.height; // 0 top .. 1 bottom
    const v = Math.round((0.5 - t) * 10); // +5 top .. -5 bottom
    setSpeed(Math.max(-5, Math.min(5, v)));
  };

  // Hand control of the paper: drag, flick, wheel.
  const onPagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = m.current;
    s.grab = { y: e.clientY, t: performance.now() };
    s.vel = 0;
    s.rewind = null;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setGrab(true);
  };
  const onPagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = m.current;
    if (!s.grab) return;
    const dy = ((e.clientY - s.grab.y) / scaleRef.current) * SCALE2;
    const now = performance.now();
    const frames = Math.max(0.5, (now - s.grab.t) / 16);
    s.offset -= dy;
    s.vel = -dy / frames;
    s.grab = { y: e.clientY, t: now };
  };
  const onPagePointerUp = () => {
    m.current.grab = null;
    setGrab(false);
  };

  // Mouse over the device: tilt it and move the glare on the paper.
  const onStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const t = tiltRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    m.current.ty = nx * TILT_DEG;
    m.current.tx = -ny * TILT_DEG;
    pageRef.current?.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
    pageRef.current?.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const onStagePointerLeave = () => {
    m.current.tx = 0;
    m.current.ty = 0;
  };

  const btn = (key: string, label: string, aria: string, onClick: () => void, extra: string, icon: React.ReactNode) => (
    <button
      type="button"
      className={`r-button ${extra}`}
      aria-label={aria}
      data-pressed={pressed === key}
      onPointerDown={() => {
        setPressed(key);
        sound("down");
      }}
      onPointerUp={() => setTimeout(() => setPressed((p) => (p === key ? null : p)), 130)}
      onPointerCancel={() => setPressed(null)}
      onClick={() => {
        sound("up");
        onClick();
      }}
    >
      <span className="r-button-face">{icon}</span>
      <span className="r-button-label" style={{ fontFamily: labelFont }}>
        {label}
      </span>
    </button>
  );

  const rollerVars = {
    "--roll-dur": `${(2.4 / Math.max(1, Math.abs(speed))).toFixed(2)}s`,
    "--roll-dir": speed < 0 ? "reverse" : "normal",
    "--roll-play": auto && speed !== 0 ? "running" : "paused",
  } as React.CSSProperties;

  return (
    <div className="r-container" onPointerMove={onStagePointerMove} onPointerLeave={onStagePointerLeave}>
      <div className="r-scaler" style={{ width: W * scale, height: H * scale }}>
        <div ref={tiltRef} className="r-tilt">
          <div className="r-device" style={{ transform: `scale(${scale})` }} role="group" aria-label="Documentation reader" data-ready={ready}>
            <div className="r-body" />
            <div
              ref={pageRef}
              className="r-page"
              data-grab={grab}
              style={{ left: PAGE.x, top: PAGE.y, width: PAGE.w, height: PAGE.h, ...rollerVars }}
              onPointerDown={onPagePointerDown}
              onPointerMove={onPagePointerMove}
              onPointerUp={onPagePointerUp}
              onPointerCancel={onPagePointerUp}
              onWheel={(e) => {
                const s = m.current;
                s.rewind = null;
                s.offset += e.deltaY * SCALE2 * 0.6;
              }}
            >
              <canvas ref={canvasRef} width={PAGE.w * SCALE2} height={PAGE.h * SCALE2} role="img" aria-label={`Roll ${roll.code}: ${roll.title}`} />
              <div className="r-page-shadow" />
              <div className="r-glare" />
              <div className="r-roller r-roller-top" />
              <div className="r-roller r-roller-bottom" />
            </div>
            <div className="r-panel" />
            <div className="r-lcd" style={{ fontFamily: labelFont }} aria-hidden="true">
              <span>R{roll.code}</span>
              <span>
                SPD {speed > 0 ? "+" : ""}
                {speed}
              </span>
              <span className={`r-lcd-dot ${auto ? "is-on" : ""}`} />
            </div>
            <div className="r-track" aria-hidden="true">
              {[5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5].map((n, i) => (
                <span key={i} className="r-tick" data-on={5 - i === speed} style={{ top: `${(i / 10) * 100}%`, fontFamily: labelFont }}>
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
              data-drag={sliderDrag}
              onPointerDown={(e) => {
                setSliderDrag(true);
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setFromPointer(e.clientY);
                sound("down");
              }}
              onPointerMove={(e) => sliderDrag && setFromPointer(e.clientY)}
              onPointerUp={() => setSliderDrag(false)}
              onPointerCancel={() => setSliderDrag(false)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") nudge(1);
                if (e.key === "ArrowDown") nudge(-1);
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
              {btn("next", "NEXT ROLL", "Next roll", () => go(1), "", <span>&gt;|</span>)}
              {btn("prev", "PREV ROLL", "Previous roll", () => go(-1), "", <span>|&lt;</span>)}
              {btn("up", "SPD UP", "Speed up", () => nudge(1), "", <span>&raquo;</span>)}
              {btn("down", "SPD DOWN", "Speed down", () => nudge(-1), "", <span>&laquo;</span>)}
              {btn("auto", "AUTO PLAY", auto ? "Stop auto play" : "Start auto play", () => setAuto((a) => !a), `r-button-red ${auto ? "is-on" : ""}`, <span className="r-auto-icon">&#8635;</span>)}
            </div>
            <span className="sr-only" role="status" aria-live="polite">
              Roll {roll.code} {roll.title}. Speed {speed}. Auto play {auto ? "on" : "off"}.
            </span>
          </div>
        </div>
      </div>
      <p className="r-note" style={{ fontFamily: labelFont }}>
        ROLL {roll.code} / {String(rolls.length).padStart(2, "0")} · {roll.title.toUpperCase()} · DRAG THE PAPER · ← → ROLLS · ↑ ↓ SPEED · SPACE AUTO
      </p>
    </div>
  );
}
