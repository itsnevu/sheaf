"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { renderSheet, SHEET_SIZE } from "./sheet";

/**
 * The fiche viewer: a chalk-grey bezel around a blackish body; a square screen with a curved,
 * tinted glass look; three knobs (X-AXIS, Y-AXIS, ROTATE) under it; ZOOM and FOCUS sliders and
 * a FILTER dial on the right. The sheet is drawn once to an offscreen canvas and projected onto
 * the screen with the controls' transform, blur and tint.
 */
const SCREEN = 776;
const FILTERS = ["none", "#7fd9a8", "#f0c060", "#8fd3ff", "#f7a4d6", "#d0d0d0", "#c9a875", "#7d9cff", "#ff7a6b", "#c39bff", "#ffffff", "invert"];

function useClick() {
  const ctx = useRef<AudioContext | null>(null);
  const armed = useRef(false);
  useEffect(() => {
    const arm = () => (armed.current = true);
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, []);
  return useCallback((f = 900) => {
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
      g.gain.setValueAtTime(0.015, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
      o.start(t);
      o.stop(t + 0.02);
    } catch {
      // silent
    }
  }, []);
}

/** A rotary knob: drag vertically or use arrow keys. Value is in [min, max]. */
function Knob({ label, value, min, max, step, onChange, labelFont, size = 48, divisions }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; labelFont: string; size?: number; divisions?: number }) {
  const start = useRef<{ y: number; v: number } | null>(null);
  const angle = -135 + ((value - min) / (max - min)) * 270;
  const snap = (v: number) => (divisions ? Math.round(((v - min) / (max - min)) * divisions) * ((max - min) / divisions) + min : v);
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
        style={{ width: size, height: size }}
        onPointerDown={(e) => {
          start.current = { y: e.clientY, v: value };
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const dv = ((start.current.y - e.clientY) / 160) * (max - min);
          onChange(snap(Math.max(min, Math.min(max, start.current.v + dv))));
        }}
        onPointerUp={() => (start.current = null)}
        onWheel={(e) => onChange(snap(Math.max(min, Math.min(max, value + (e.deltaY < 0 ? step : -step)))))}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(Math.min(max, value + step));
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(Math.max(min, value - step));
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
          <g transform={`rotate(${angle} 15 15)`}>
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
  const drag = useRef(false);
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
        onPointerDown={(e) => {
          drag.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          set(e.clientY);
        }}
        onPointerMove={(e) => drag.current && set(e.clientY)}
        onPointerUp={() => (drag.current = false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") onChange(Math.min(5, value + 0.5));
          if (e.key === "ArrowDown") onChange(Math.max(0, value - 0.5));
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

export default function Fiche({ labelFont, textFont }: { labelFont: string; textFont: string }) {
  const click = useClick();
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [rot, setRot] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [focus, setFocus] = useState(0);
  const [filter, setFilter] = useState(0);
  const [scale, setScale] = useState(1);
  const screenRef = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setScale(Math.max(0.34, Math.min(1, Math.min(w, h) / (SCREEN + 80 + 160))));
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
        draw();
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textFont, labelFont]);

  const draw = useCallback(() => {
    const out = screenRef.current;
    const sheet = sheetRef.current;
    if (!out || !sheet) return;
    const ctx = out.getContext("2d")!;
    ctx.save();
    ctx.filter = focus > 0.05 ? `blur(${(focus * 1.4).toFixed(1)}px)` : "none";
    ctx.fillStyle = "#0d0f0e";
    ctx.fillRect(0, 0, SCREEN, SCREEN);
    const s = (SCREEN / SHEET_SIZE) * (1 + zoom * 0.75);
    ctx.translate(SCREEN / 2 + x, SCREEN / 2 + y);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(s, s);
    ctx.drawImage(sheet, -SHEET_SIZE / 2, -SHEET_SIZE / 2);
    ctx.restore();
    const f = FILTERS[filter]!;
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
  }, [x, y, rot, zoom, focus, filter]);

  useEffect(() => {
    draw();
  }, [draw]);

  const on = (fn: (v: number) => void) => (v: number) => {
    click();
    fn(v);
  };

  return (
    <div className="f-sizer">
      <div className="f-scaler" style={{ width: 900 * scale, height: 900 * scale }}>
      <div className="f-app" style={{ transform: `scale(${scale})` }} role="group" aria-label="Security fiche viewer">
        <div className="f-container">
          <div className="f-fiche">
            <div className="f-screen">
              <canvas ref={screenRef} width={SCREEN} height={SCREEN} role="img" aria-label="Security and privacy fiche. Use the knobs to pan and rotate, the sliders to zoom and focus." />
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
            <div className="f-topfill" />
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
                      <text key={i} x={50 + Math.cos(a) * 44} y={50 + Math.sin(a) * 44 + 3} textAnchor="middle" fontSize="8" fill="#414042" style={{ fontFamily: labelFont }}>
                        {i}
                      </text>
                    );
                  })}
                </svg>
                <Knob label="FILTER" value={filter} min={0} max={11} step={1} divisions={11} onChange={on((v) => setFilter(Math.round(v)))} labelFont={labelFont} size={63} />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <p className="f-note" style={{ fontFamily: labelFont }}>
        X {Math.round(x)} · Y {Math.round(y)} · ROT {Math.round(rot)}° · ZOOM {zoom.toFixed(1)} · FOCUS {focus.toFixed(1)} · FILTER {filter}
      </p>
    </div>
  );
}
