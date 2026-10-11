import { PNG } from 'pngjs';
import { colorOf, INK } from './palette';

const OPAQUE = 0x1000000;

/** A pixel canvas. Pixels are 0 (transparent) or an opaque colour (OPAQUE | 0xRRGGBB). */
export class Canvas {
  readonly px: Uint32Array;
  constructor(readonly w: number, readonly h: number) {
    this.px = new Uint32Array(w * h);
  }
  static raw(spec: string): number {
    return OPAQUE | colorOf(spec);
  }
  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.px[y * this.w + x] ?? 0;
  }
  setRaw(x: number, y: number, v: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = v;
  }
  set(x: number, y: number, spec: string): void {
    this.setRaw(Math.round(x), Math.round(y), Canvas.raw(spec));
  }
  clear(x: number, y: number): void {
    this.setRaw(x, y, 0);
  }
  rect(x: number, y: number, w: number, h: number, spec: string): void {
    const v = Canvas.raw(spec);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.setRaw(x + i, y + j, v);
  }
  /** Filled ellipse centred at (cx, cy) with radii rx, ry (centre may be a half pixel). */
  ellipse(cx: number, cy: number, rx: number, ry: number, spec: string): void {
    const v = Canvas.raw(spec);
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) {
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const dx = (i - cx) / (rx + 0.35);
        const dy = (j - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.setRaw(i, j, v);
      }
    }
  }
  disc(cx: number, cy: number, r: number, spec: string): void {
    this.ellipse(cx, cy, r, r, spec);
  }
  line(x0: number, y0: number, x1: number, y1: number, spec: string, thick = 1): void {
    const v = Canvas.raw(spec);
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= n; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / n);
      const y = Math.round(y0 + ((y1 - y0) * s) / n);
      for (let j = 0; j < thick; j++) for (let i = 0; i < thick; i++) this.setRaw(x + i, y + j, v);
    }
  }
  /** Even-odd polygon fill. */
  poly(pts: [number, number][], spec: string): void {
    const v = Canvas.raw(spec);
    const ys = pts.map((p) => p[1]);
    const xs = pts.map((p) => p[0]);
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    const x0 = Math.floor(Math.min(...xs));
    const x1 = Math.ceil(Math.max(...xs));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        let inside = false;
        const px = x + 0.5;
        const py = y + 0.5;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i] as [number, number];
          const [xj, yj] = pts[j] as [number, number];
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.setRaw(x, y, v);
      }
    }
  }
  /** Stamp another canvas at (ox, oy); transparent pixels skipped. */
  blit(src: Canvas, ox: number, oy: number): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const v = src.px[y * src.w + x] ?? 0;
        if (v) this.setRaw(ox + x, oy + y, v);
      }
    }
  }
  /** Draw ASCII art. '.' and ' ' are transparent. Lowercase = palette colour, uppercase = light shade, or use `legend`. */
  ascii(rows: string[], ox: number, oy: number, legend: Record<string, string> = {}): void {
    rows.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        if (ch === '.' || ch === ' ') return;
        const spec = legend[ch] ?? defaultLegend(ch);
        if (!spec) throw new Error(`No colour for ascii char "${ch}"`);
        this.set(ox + i, oy + j, spec);
      });
    });
  }
  /** Add a 1px ink outline round the outside of everything drawn (4-neighbour). */
  outline(spec: string = INK): Canvas {
    const out = new Canvas(this.w, this.h);
    out.px.set(this.px);
    const v = Canvas.raw(spec);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) out.px[y * this.w + x] = v;
      }
    }
    return out;
  }
  bbox(): { x0: number; y0: number; x1: number; y1: number } | null {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.px[y * this.w + x]) {
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }
  /** Copy of the region [x0,x0+w) x [y0,y0+h), padded with transparency. */
  crop(x0: number, y0: number, w: number, h: number): Canvas {
    const out = new Canvas(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.px[y * w + x] = this.get(x0 + x, y0 + y);
    return out;
  }
  /** Nearest-neighbour upscale by an integer factor. */
  scale(k: number): Canvas {
    const out = new Canvas(this.w * k, this.h * k);
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.px[y * out.w + x] = this.get(Math.floor(x / k), Math.floor(y / k));
    return out;
  }
  encode(): Buffer {
    const png = new PNG({ width: this.w, height: this.h });
    for (let i = 0; i < this.px.length; i++) {
      const v = this.px[i] ?? 0;
      png.data[i * 4] = (v >> 16) & 255;
      png.data[i * 4 + 1] = (v >> 8) & 255;
      png.data[i * 4 + 2] = v & 255;
      png.data[i * 4 + 3] = v ? 255 : 0;
    }
    return PNG.sync.write(png, { deflateLevel: 9 });
  }
}

function defaultLegend(ch: string): string | undefined {
  if (/[a-z]/.test(ch)) return ch;
  if (/[A-Z]/.test(ch)) return `${ch.toLowerCase()}+`;
  return undefined;
}

/** A small icon: `size` square, drawn by `draw`, then outlined in ink. */
export function icon(size: number, draw: (c: Canvas) => void, outline = true): Canvas {
  const c = new Canvas(size, size);
  draw(c);
  return outline ? c.outline() : c;
}

/** Build an outlined icon from ASCII rows, centred in a size x size canvas. */
export function asciiIcon(size: number, rows: string[], legend: Record<string, string> = {}): Canvas {
  const w = Math.max(...rows.map((r) => r.length));
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`ascii row ${i} has width ${r.length}, expected ${w}`);
  });
  if (w > size - 2 || rows.length > size - 2) throw new Error(`ascii art ${w}x${rows.length} too big for ${size}`);
  const c = new Canvas(size, size);
  c.ascii(rows, Math.floor((size - w) / 2), Math.floor((size - rows.length) / 2), legend);
  return c.outline();
}
