import type { Line, Work } from "./receipts";

/**
 * Renders a work onto a low-resolution canvas so the page can scale it up with pixelated
 * rendering. Logical width is 320 px; the page shows it at 2× (640 px) or whatever fits.
 */
export const LOGICAL_WIDTH = 320;
const PAD = 14;
const FONT = 16; // VT323 sits on a 16 px grid
const LINE = 16;

export interface Rendered {
  canvas: HTMLCanvasElement;
  /** Vertical extent of each printed work on the roll, for click targets. */
  links: { top: number; height: number; href: string }[];
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Floyd–Steinberg dither to two colours: ink on paper. */
function dither(src: HTMLImageElement, width: number, ink: string): HTMLCanvasElement {
  const ratio = src.naturalHeight / Math.max(1, src.naturalWidth);
  const w = width;
  const h = Math.max(1, Math.round(width * ratio));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = (d[i * 4]! * 0.299 + d[i * 4 + 1]! * 0.587 + d[i * 4 + 2]! * 0.114) / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = gray[i]!;
      const val = old < 0.5 ? 0 : 1;
      const err = old - val;
      gray[i] = val;
      if (x + 1 < w) gray[i + 1]! += err * (7 / 16);
      if (y + 1 < h) {
        if (x > 0) gray[i + w - 1]! += err * (3 / 16);
        gray[i + w]! += err * (5 / 16);
        if (x + 1 < w) gray[i + w + 1]! += err * (1 / 16);
      }
    }
  }
  // Dark parts of the source become ink on the black paper, so invert: ink where the image is light.
  const rgb = hexToRgb(ink);
  for (let i = 0; i < w * h; i++) {
    const on = gray[i]! >= 0.5;
    d[i * 4] = on ? rgb[0] : 0;
    d[i * 4 + 1] = on ? rgb[1] : 0;
    d[i * 4 + 2] = on ? rgb[2] : 0;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Measures then draws one work. Returns the height used and the link band, if any. */
export async function renderWork(work: Work, ink: string, fontFamily: string): Promise<{ canvas: HTMLCanvasElement; height: number }> {
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `${FONT}px ${fontFamily}`;
  const maxW = LOGICAL_WIDTH - PAD * 2;
  const images = new Map<string, HTMLImageElement | null>();
  for (const l of work.lines) if (l.kind === "img" && !images.has(l.src)) images.set(l.src, await loadImage(l.src));

  // Pass 1: layout.
  type Op = { y: number; draw: (ctx: CanvasRenderingContext2D) => void; h: number };
  const ops: Op[] = [];
  let y = PAD;
  const text = (t: string, x: number, yy: number, align: CanvasTextAlign = "left", bold = false) => (ctx: CanvasRenderingContext2D) => {
    ctx.font = `${bold ? "bold " : ""}${FONT}px ${fontFamily}`;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
    ctx.fillText(t, x, yy);
  };
  for (const l of work.lines) {
    const line: Line = l;
    switch (line.kind) {
      case "h1": {
        const lines = wrap(measure, line.text, maxW);
        for (const t of lines) {
          const yy = y;
          ops.push({ y: yy, h: LINE + 2, draw: (ctx) => { text(t, PAD, yy, "left", true)(ctx); ctx.fillRect(PAD, yy + LINE - 1, Math.min(maxW, ctx.measureText(t).width), 1); } });
          y += LINE + 2;
        }
        y += 4;
        break;
      }
      case "h2": {
        const yy = y;
        ops.push({ y: yy, h: LINE, draw: text(line.text.toUpperCase(), PAD, yy, "left", true) });
        y += LINE + 2;
        break;
      }
      case "p": {
        for (const t of wrap(measure, line.text, maxW)) {
          const yy = y;
          ops.push({ y: yy, h: LINE, draw: text(t, PAD, yy) });
          y += LINE;
        }
        y += 6;
        break;
      }
      case "small": {
        for (const t of wrap(measure, line.text, maxW)) {
          const yy = y;
          ops.push({ y: yy, h: LINE, draw: (ctx) => { ctx.globalAlpha = 0.6; text(t, PAD, yy)(ctx); ctx.globalAlpha = 1; } });
          y += LINE;
        }
        y += 4;
        break;
      }
      case "kv": {
        const kw = 96;
        const vlines = wrap(measure, line.v, maxW - kw);
        const y0 = y;
        ops.push({ y: y0, h: LINE, draw: text(line.k, PAD, y0, "left", true) });
        for (const t of vlines) {
          const yy = y;
          ops.push({ y: yy, h: LINE, draw: text(t, PAD + kw, yy) });
          y += LINE;
        }
        y += 2;
        break;
      }
      case "row": {
        const n = line.cols.length;
        const colW = maxW / n;
        const yy = y;
        line.cols.forEach((c, i) => {
          let t = c;
          while (t.length > 1 && measure.measureText(t).width > colW - 4) t = t.slice(0, -1);
          const x = PAD + i * colW;
          ops.push({ y: yy, h: LINE, draw: text(t, x, yy, "left", !!line.head) });
        });
        if (line.head) ops.push({ y: yy + LINE, h: 1, draw: (ctx) => { ctx.fillStyle = ink; ctx.fillRect(PAD, yy + LINE, maxW, 1); } });
        y += LINE + (line.head ? 3 : 1);
        break;
      }
      case "rule": {
        const yy = y + 4;
        const dots = line.style === "dots";
        ops.push({ y: yy, h: 2, draw: (ctx) => { ctx.fillStyle = ink; if (dots) { for (let x = PAD; x < LOGICAL_WIDTH - PAD; x += 4) ctx.fillRect(x, yy, 2, 1); } else ctx.fillRect(PAD, yy, maxW, 1); } });
        y += 12;
        break;
      }
      case "gap":
        y += LINE * (line.rows ?? 1) * 0.5;
        break;
      case "img": {
        const img = images.get(line.src);
        if (!img) {
          const yy = y;
          ops.push({ y: yy, h: LINE, draw: text(`[${line.alt}]`, PAD, yy) });
          y += LINE + 4;
          break;
        }
        const w = Math.min(maxW, 200);
        const bitmap = dither(img, w, ink);
        const yy = y;
        const x = Math.round((LOGICAL_WIDTH - w) / 2);
        ops.push({ y: yy, h: bitmap.height, draw: (ctx) => ctx.drawImage(bitmap, x, yy) });
        y += bitmap.height + 8;
        break;
      }
      case "cta": {
        const yy = y;
        const w = Math.min(maxW, measure.measureText(line.text).width + 16);
        ops.push({ y: yy, h: LINE + 8, draw: (ctx) => { ctx.fillStyle = ink; ctx.fillRect(PAD, yy, w, LINE + 8); ctx.fillStyle = "#000000"; ctx.font = `bold ${FONT}px ${fontFamily}`; ctx.textBaseline = "top"; ctx.textAlign = "left"; ctx.fillText(line.text, PAD + 8, yy + 4); } });
        y += LINE + 14;
        break;
      }
    }
  }
  y += PAD + 6;
  const canvas = document.createElement("canvas");
  canvas.width = LOGICAL_WIDTH;
  canvas.height = y;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  for (const op of ops) op.draw(ctx);
  // Tear line at the bottom of every strip.
  ctx.fillStyle = ink;
  for (let x = 0; x < LOGICAL_WIDTH; x += 6) ctx.fillRect(x, y - 3, 3, 1);
  return { canvas, height: y };
}
