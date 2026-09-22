"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { renderSheet, SHEET_SIZE } from "./sheet";

/**
 * The fiche viewer: a chalk-grey bezel around a blackish body; a square screen with a curved,
 * tinted glass look; three knobs (X-AXIS, Y-AXIS, ROTATE) under it; ZOOM and FOCUS sliders and
 * a FILTER dial on the right. The sheet is drawn once to an offscreen canvas and projected onto
 * the screen with the controls' transform, blur and tint. The optics follow the knobs with a
 * little inertia, the lamp warms up on power-on, a filter change flashes, dust drifts on the
 * glass, the screen itself can be dragged to pan and wheeled to zoom, and a readout in the top
 * panel shows the setting. The body tilts under the mouse.
 */
const SCREEN = 776;
const FILTERS = ["none", "#7fd9a8", "#f0c060", "#8fd3ff", "#f7a4d6", "#d0d0d0", "#c9a875", "#7d9cff", "#ff7a6b", "#c39bff", "#ffffff", "invert"];
const DUST_N = 26;
const TILT_DEG = 5;

interface Vals {
  x: number;
  y: number;
  rot: number;
  zoom: number;
  focus: number;
  filter: number;
}
const ZERO: Vals = { x: 0, y: 0, rot: 0, zoom: 0, focus: 0, filter: 0 };

function useClick() {
  const ctx = useRef<AudioContext | null>(null);
  const armed = useRef(false);
  useEffect(() => {
    const arm = () => (armed.current = true);
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, []);
  return useCallback((f = 900, dur = 0.02, vol = 0.015) => {
    if (!armed.current) return;
    try {
      ctx.current ??= new AudioContext();
      const ac = ctx.current;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g);
      g.connect(ac.destination);
      o.type = "square";
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur);
    } catch {
      // silent
    }
  }, []);
}

/** A rotary knob: drag vertically, wheel, arrow keys; double-click resets. */
function Knob({ label, value, min, max, step, onChange, labelFont, size = 48, divisions, reset = 0 }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; labelFont: string; size?: number; divisions?: number; reset?: number }) {
  const start = useRef<{ y: number; v: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const angle = -135 + ((value - min) / (max - min)) * 270;
  const snap = (v: number) => (divisions ? Math.round(((v - min) / (max - min)) * divisions) * ((max - min) / divisions) + min : v);
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="f-labelcol">
      <div
        className="f-knob"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(value * 100) / 100}
        data-drag={drag}
        style={{ width: size, height: size }}
        onPointerDown={(e) => {
          start.current = { y: e.clientY, v: value };
          e.currentTarget.setPointerCapture?.(e.pointerId);
          setDrag(true);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const dv = ((start.current.y - e.clientY) / 160) * (max - min);
          onChange(snap(clamp(start.current.v + dv)));
        }}
        onPointerUp={() => {
          start.current = null;
          setDrag(false);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDrag(false);
        }}
        onDoubleClick={() => onChange(reset)}
        onWheel={(e) => onChange(snap(clamp(value + (e.deltaY < 0 ? step : -step))))}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(clamp(value + step));
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(clamp(value - step));
          if (e.key === "Home") onChange(reset);
        }}
      >
        <svg viewBox="0 0 30 30" width={size} height={size} aria-hidden="true">
          <circle cx="15" cy="15" r="14.4" fill="#2b2b2b" />
          <circle cx="15" cy="15" r="13.8" fill="#414042" />
          <g fill="#8c8e90">
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return <rect key={i} x={15 + Math.cos(a) * 13 - 0.35} y={15 + Math.sin(a) * 13 - 0.35} width="0.7" height="0.7" />;
            })}
          </g>
          <g className="f-knob-ind" style={{ transform: `rotate(${angle}deg)`, transformOrigin: "50% 50%", transformBox: "view-box" }}>
            <rect x="1" y="14.4" width="4.4" height="1.2" fill="#d1d3d4" />
          </g>
        </svg>
      </div>
      <p style={{ fontFamily: labelFont }}>{label}</p>
    </div>
  );
}

function VSlider({ label, value, onChange, labelFont }: { label: string; value: number; onChange: (v: number) => void; labelFont: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const set = (clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    onChange(Math.max(0, Math.min(5, ((r.bottom - clientY) / r.height) * 5)));
  };
  return (
    <div className="f-range">
      <p style={{ fontFamily: labelFont }}>{label}</p>
      <div
        ref={ref}
        className="f-range-track"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={Math.round(value * 10) / 10}
        data-drag={drag}
        onPointerDown={(e) => {
          setDrag(true);
          e.currentTarget.setPointerCapture?.(e.pointerId);
          set(e.clientY);
        }}
        onPointerMove={(e) => drag && set(e.clientY)}
        onPointerUp={() => setDrag(false)}
        onPointerCancel={() => setDrag(false)}
        onDoubleClick={() => onChange(0)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") onChange(Math.min(5, value + 0.5));
          if (e.key === "ArrowDown") onChange(Math.max(0, value - 0.5));
          if (e.key === "Home") onChange(0);
        }}
      >
        {["V", "IV", "III", "II", "I", "0"].map((n, i) => (
          <span key={n} className="f-range-tick" style={{ top: `${(i / 5) * 100}%`, fontFamily: labelFont }}>
            {n}
          </span>
        ))}
        <span className="f-range-line" />
        <span className="f-range-thumb" style={{ top: `${(1 - value / 5) * 100}%` }} />
      </div>
    </div>
  );
}

interface Dust {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
}

const sg = (v: number, w = 3) => (v < 0 ? "-" : "+") + String(Math.abs(Math.round(v))).padStart(w, "0");

export default function Fiche({ labelFont, textFont }: { labelFont: string; textFont: string }) {
  const click = useClick();
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [rot, setRot] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [focus, setFocus] = useState(0);
  const [filter, setFilter] = useState(0);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);
  const [grab, setGrab] = useState(false);
  const screenRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLCanvasElement | null>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const screenBoxRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const target = useRef<Vals>({ ...ZERO });
  const cur = useRef<Vals>({ ...ZERO, focus: 5 });
  const fx = useRef({ lamp: 0, flash: 0, dirty: true, dust: [] as Dust[], tiltX: 0, tiltY: 0, tx: 0, ty: 0, drawnFilter: -1 });
  const grabRef = useRef<{ cx: number; cy: number; x: number; y: number } | null>(null);

  useEffect(() => {
    target.current = { x, y, rot, zoom, focus, filter };
    fx.current.dirty = true;
  }, [x, y, rot, zoom, focus, filter]);

  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const s = Math.max(0.34, Math.min(1, Math.min(w, h) / (SCREEN + 80 + 160)));
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
      .load(`16px ${textFont}`)
      .catch(() => undefined)
      .then(() => {
        if (!alive) return;
        sheetRef.current = renderSheet(textFont, labelFont);
        fx.current.lamp = 0;
        fx.current.dirty = true;
        cur.current.focus = 5;
        click(240, 0.25, 0.02);
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [textFont, labelFont, click]);

  useEffect(() => {
    // Seed the dust once.
    let seed = 11;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed >> 8) / 0x7fffff;
    };
    fx.current.dust = Array.from({ length: DUST_N }, () => ({ x: rnd() * SCREEN, y: rnd() * SCREEN, r: 0.6 + rnd() * 1.4, vx: (rnd() - 0.5) * 0.12, vy: 0.05 + rnd() * 0.12, a: 0.25 + rnd() * 0.5 }));
  }, []);

  const drawBase = useCallback((breath = 0) => {
    const out = screenRef.current;
    const sheet = sheetRef.current;
    if (!out || !sheet) return;
    const c = cur.current;
    const f = FILTERS[target.current.filter] ?? "none";
    const ctx = out.getContext("2d")!;
    ctx.save();
    ctx.filter = c.focus > 0.05 ? `blur(${(c.focus * 1.4).toFixed(1)}px)` : "none";
    ctx.fillStyle = "#0d0f0e";
    ctx.fillRect(0, 0, SCREEN, SCREEN);
    const s = (SCREEN / SHEET_SIZE) * (1 + c.zoom * 0.75) * (1 + breath);
    ctx.translate(SCREEN / 2 + c.x, SCREEN / 2 + c.y);
    ctx.rotate((c.rot * Math.PI) / 180);
    ctx.scale(s, s);
    ctx.drawImage(sheet, -SHEET_SIZE / 2, -SHEET_SIZE / 2);
    ctx.restore();
    if (f === "invert") {
      ctx.globalCompositeOperation = "difference";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, SCREEN, SCREEN);
    } else if (f !== "none") {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = f;
      ctx.fillRect(0, 0, SCREEN, SCREEN);
    }
    ctx.globalCompositeOperation = "source-over";
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const c = cur.current;
      const t = target.current;
      const e = fx.current;
      // Mechanical inertia: the optics chase the knobs.
      const k = reduced ? 1 : 1 - Math.pow(0.0025, dt / 1000);
      let moved = false;
      for (const key of ["x", "y", "rot", "zoom", "focus"] as const) {
        const d = t[key] - c[key];
        if (Math.abs(d) > 0.002) {
          c[key] += d * k;
          moved = true;
        } else if (c[key] !== t[key]) {
          c[key] = t[key];
          moved = true;
        }
      }
      if (t.filter !== e.drawnFilter) {
        if (e.drawnFilter >= 0) e.flash = 1;
        e.drawnFilter = t.filter;
        moved = true;
      }
      // Lens breathing: the optics never sit perfectly still (only when sharp, so no blur per frame).
      const breathing = !reduced && c.focus < 0.05 && e.lamp >= 1;
      if (sheetRef.current && (moved || e.dirty || breathing)) {
        drawBase(breathing ? Math.sin(now / 1700) * 0.0035 : 0);
        e.dirty = false;
      }
      // Overlay: lamp warm-up, filter flash, flicker and dust.
      const ov = overlayRef.current;
      if (ov) {
        const g = ov.getContext("2d")!;
        g.clearRect(0, 0, SCREEN, SCREEN);
        if (sheetRef.current && e.lamp < 1) e.lamp = Math.min(1, e.lamp + dt / (reduced ? 1 : 1100));
        const flicker = reduced ? 0 : Math.random() * 0.02 + (Math.sin(now / 900) > 0.995 ? 0.06 : 0);
        const dark = 1 - e.lamp * (1 - flicker);
        if (dark > 0.002) {
          g.fillStyle = `rgba(0,0,0,${dark.toFixed(3)})`;
          g.fillRect(0, 0, SCREEN, SCREEN);
        }
        if (e.flash > 0.01) {
          g.fillStyle = `rgba(255,255,255,${(e.flash * 0.55).toFixed(3)})`;
          g.fillRect(0, 0, SCREEN, SCREEN);
          e.flash *= Math.pow(0.86, dt / 16);
        } else e.flash = 0;
        if (!reduced) {
          g.fillStyle = "#e8ece6";
          for (const p of e.dust) {
            p.x += p.vx * dt * 0.06;
            p.y += p.vy * dt * 0.06;
            if (p.y > SCREEN) p.y = -2;
            if (p.x < 0) p.x = SCREEN;
            if (p.x > SCREEN) p.x = 0;
            g.globalAlpha = p.a * e.lamp;
            g.beginPath();
            g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            g.fill();
          }
          g.globalAlpha = 1;
        }
      }
      const tl = tiltRef.current;
      if (tl) {
        e.tiltX += (e.tx - e.tiltX) * 0.09;
        e.tiltY += (e.ty - e.tiltY) * 0.09;
        tl.style.transform = `rotateX(${e.tiltX.toFixed(2)}deg) rotateY(${e.tiltY.toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [drawBase]);

  const clampXY = (v: number) => Math.max(-300, Math.min(300, v));
  const on = (fn: (v: number) => void) => (v: number) => {
    click();
    fn(v);
  };
  const setFilterClick = (v: number) => {
    click(520, 0.08, 0.02);
    setFilter(((Math.round(v) % 12) + 12) % 12);
  };

  // Keyboard on the page: arrows pan, + / - zoom, [ ] rotate, F filter, 0 resets.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, button, a, [role=slider], [contenteditable]")) return;
      const step = e.shiftKey ? 60 : 20;
      if (e.key === "ArrowLeft") setX((v) => clampXY(v - step));
      else if (e.key === "ArrowRight") setX((v) => clampXY(v + step));
      else if (e.key === "ArrowUp") setY((v) => clampXY(v - step));
      else if (e.key === "ArrowDown") setY((v) => clampXY(v + step));
      else if (e.key === "+" || e.key === "=") setZoom((v) => Math.min(5, v + 0.5));
      else if (e.key === "-" || e.key === "_") setZoom((v) => Math.max(0, v - 0.5));
      else if (e.key === "[") setRot((v) => Math.max(-180, v - 5));
      else if (e.key === "]") setRot((v) => Math.min(180, v + 5));
      else if (e.key === "f" || e.key === "F") setFilter((v) => (v + 1) % 12);
      else if (e.key === "0") {
        setX(0);
        setY(0);
        setRot(0);
        setZoom(0);
        setFocus(0);
      } else return;
      e.preventDefault();
      click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [click]);

  // Drag the screen to pan, wheel to zoom.
  const onScreenDown = (e: React.PointerEvent<HTMLDivElement>) => {
    grabRef.current = { cx: e.clientX, cy: e.clientY, x, y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setGrab(true);
  };
  const onScreenMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = grabRef.current;
    if (!g) return;
    const s = scaleRef.current;
    setX(clampXY(g.x + (e.clientX - g.cx) / s));
    setY(clampXY(g.y + (e.clientY - g.cy) / s));
  };
  const onScreenUp = () => {
    grabRef.current = null;
    setGrab(false);
  };

  const onStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const t = tiltRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    fx.current.ty = ((e.clientX - r.left) / r.width - 0.5) * TILT_DEG;
    fx.current.tx = -((e.clientY - r.top) / r.height - 0.5) * TILT_DEG;
    const sb = screenBoxRef.current;
    if (sb) {
      const sr = sb.getBoundingClientRect();
      sb.style.setProperty("--gx", `${((e.clientX - sr.left) / sr.width) * 100}%`);
      sb.style.setProperty("--gy", `${((e.clientY - sr.top) / sr.height) * 100}%`);
    }
  };
  const onStagePointerLeave = () => {
    fx.current.tx = 0;
    fx.current.ty = 0;
  };

  return (
    <div className="f-sizer" onPointerMove={onStagePointerMove} onPointerLeave={onStagePointerLeave}>
      <div className="f-scaler" style={{ width: 900 * scale, height: 900 * scale }}>
        <div ref={tiltRef} className="f-tilt">
          <div className="f-app" style={{ transform: `scale(${scale})` }} role="group" aria-label="Security fiche viewer" data-ready={ready}>
            <div className="f-container">
              <div className="f-fiche">
                <div ref={screenBoxRef} className="f-screen" data-grab={grab} onPointerDown={onScreenDown} onPointerMove={onScreenMove} onPointerUp={onScreenUp} onPointerCancel={onScreenUp} onWheel={(e) => setZoom((v) => Math.max(0, Math.min(5, v - e.deltaY * 0.004)))}>
                  <canvas ref={screenRef} width={SCREEN} height={SCREEN} role="img" aria-label="Security and privacy fiche. Use the knobs to pan and rotate, the sliders to zoom and focus, or drag the screen." />
                  <canvas ref={overlayRef} className="f-dust" width={SCREEN} height={SCREEN} aria-hidden="true" />
                  <div className="f-scan" aria-hidden="true" />
                  <div className="f-glass" aria-hidden="true" />
                  <div className="f-grain" aria-hidden="true" />
                </div>
                <div className="f-bottom">
                  <div className="f-logo" style={{ fontFamily: labelFont }}>
                    <span className="f-logo-disc" />
                    <span className="f-logo-word">SHEAF</span>
                    <span className="f-logo-sub">SECURITY FICHE VIEWER</span>
                  </div>
                  <div className="f-buttonrow">
                    <div className="f-spinners">
                      <Knob label="X-AXIS" value={x} min={-300} max={300} step={20} onChange={on(setX)} labelFont={labelFont} />
                      <Knob label="Y-AXIS" value={y} min={-300} max={300} step={20} onChange={on(setY)} labelFont={labelFont} />
                      <Knob label="ROTATE" value={rot} min={-180} max={180} step={5} onChange={on(setRot)} labelFont={labelFont} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="f-right">
                <div className="f-topfill">
                  <div className="f-readout" style={{ fontFamily: labelFont }} aria-hidden="true">
                    <span className={`f-lamp ${ready ? "is-on" : ""}`} />
                    <span>X {sg(x)}</span>
                    <span>Y {sg(y)}</span>
                    <span>R {sg(rot)}</span>
                    <span>Z {zoom.toFixed(1)}</span>
                    <span>F {focus.toFixed(1)}</span>
                    <span>FL {String(filter).padStart(2, "0")}</span>
                  </div>
                </div>
                <div className="f-bottomfill">
                  <div className="f-rangewrap">
                    <VSlider label="ZOOM" value={zoom} onChange={on(setZoom)} labelFont={labelFont} />
                    <VSlider label="FOCUS" value={focus} onChange={on(setFocus)} labelFont={labelFont} />
                  </div>
                  <div className="f-filter">
                    <svg className="f-numbers" viewBox="0 0 100 100" aria-hidden="true">
                      {Array.from({ length: 12 }, (_, i) => {
                        const a = ((i / 12) * 270 - 225) * (Math.PI / 180);
                        return (
                          <text key={i} x={50 + Math.cos(a) * 44} y={50 + Math.sin(a) * 44 + 3} textAnchor="middle" fontSize="8" fill={i === filter ? "#e5262b" : "#414042"} fontWeight={i === filter ? 700 : 400} style={{ fontFamily: labelFont }}>
                            {i}
                          </text>
                        );
                      })}
                    </svg>
                    <Knob label="FILTER" value={filter} min={0} max={11} step={1} divisions={11} onChange={setFilterClick} labelFont={labelFont} size={63} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="f-note" style={{ fontFamily: labelFont }}>
        X {Math.round(x)} · Y {Math.round(y)} · ROT {Math.round(rot)}° · ZOOM {zoom.toFixed(1)} · FOCUS {focus.toFixed(1)} · FILTER {filter} · DRAG THE SCREEN · WHEEL ZOOMS · ARROWS PAN · F FILTER · 0 RESET
      </p>
      <span className="sr-only" role="status" aria-live="polite">
        Fiche x {Math.round(x)}, y {Math.round(y)}, rotation {Math.round(rot)}, zoom {zoom.toFixed(1)}, focus {focus.toFixed(1)}, filter {filter}.
      </span>
    </div>
  );
}
