import { Canvas } from './canvas';
import { shadeMid } from './palette';

export interface Sprite {
  canvas: Canvas;
  /** Anchor in native pixels. */
  ax: number;
  ay: number;
}

/** A contact sheet: sprites laid out in a grid on a solid backdrop, scaled up. For reviewing output. */
export function contactSheet(items: Sprite[], opts: { scale?: number; cols?: number; bg?: string; cell?: [number, number] } = {}): Canvas {
  const scale = opts.scale ?? 3;
  const cols = opts.cols ?? 6;
  const cw = opts.cell?.[0] ?? Math.max(...items.map((s) => s.canvas.w));
  const ch = opts.cell?.[1] ?? Math.max(...items.map((s) => s.canvas.h));
  const rows = Math.ceil(items.length / cols);
  const W = cols * (cw + 4) + 4;
  const H = rows * (ch + 4) + 4;
  const sheet = new Canvas(W, H);
  const bg = 0x1000000 | shadeMid(opts.bg ?? 'g');
  sheet.px.fill(bg);
  items.forEach((s, i) => {
    const cx = 4 + (i % cols) * (cw + 4);
    const cy = 4 + Math.floor(i / cols) * (ch + 4);
    sheet.blit(s.canvas, cx + Math.floor((cw - s.canvas.w) / 2), cy + Math.floor((ch - s.canvas.h) / 2));
  });
  return sheet.scale(scale);
}
