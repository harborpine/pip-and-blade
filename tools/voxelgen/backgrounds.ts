/** Portrait backgrounds, 180x320 native: calm and dark in the lower half so sprites and UI stay readable. */
import { Canvas } from './canvas';
import type { Sprite } from './sheet';

export const BG_W = 180;
export const BG_H = 320;

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const bayer = (x: number, y: number): number => ((BAYER[y & 3] as number[])[x & 3] as number) / 16 + 1 / 32;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Stop = [number, string];

/** Vertical gradient between colour stops, dithered with an ordered matrix. */
function gradient(c: Canvas, stops: Stop[]): void {
  for (let y = 0; y < c.h; y++) {
    let i = 0;
    while (i < stops.length - 2 && y >= (stops[i + 1] as Stop)[0]) i++;
    const [y0, a] = stops[i] as Stop;
    const [y1, b] = stops[i + 1] as Stop;
    const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
    for (let x = 0; x < c.w; x++) c.set(x, y, bayer(x, y) < t ? b : a);
  }
}

/** Replace pixels inside a mask with a colour, dithered by `density` (0..1). */
function sprinkle(c: Canvas, x: number, y: number, col: string, density: number): void {
  if (bayer(x, y) < density) c.set(x, y, col);
}

function lightShafts(c: Canvas, col: string, yMax: number, period: number, width: number, slope: number): void {
  for (let y = 0; y < yMax; y++) {
    const fade = 1 - y / yMax;
    for (let x = 0; x < c.w; x++) {
      const p = (((x + y * slope) % period) + period) % period;
      if (p < width) sprinkle(c, x, y, col, 0.45 * fade);
    }
  }
}

function vignette(c: Canvas, col: string, strength: number): void {
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const dx = (x - c.w / 2) / (c.w / 2);
      const dy = (y - c.h / 2) / (c.h / 2);
      const d = Math.min(1, (dx * dx + dy * dy) / 2) * strength;
      sprinkle(c, x, y, col, d * d);
    }
  }
}

function act1(): Canvas {
  const c = new Canvas(BG_W, BG_H);
  const r = rng(11);
  gradient(c, [[0, 'l-'], [40, 'e'], [120, 'f'], [190, 'f-'], [200, 'f-'], [320, 'k']]);
  lightShafts(c, 'l', 170, 46, 7, 0.6);
  // far trunks
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(r() * BG_W);
    const w = 5 + Math.floor(r() * 4);
    c.rect(x, 0, w, 195, 'f-');
    c.rect(x, 0, 1, 195, 'f');
  }
  // near trunks, dark
  for (const [x, w] of [[22, 12], [112, 10], [150, 14]] as [number, number][]) {
    c.rect(x, 0, w, 200, 'z');
    c.rect(x, 0, 2, 200, 'u');
    c.rect(x + w - 3, 0, 3, 200, 'z-');
    for (let y = 8; y < 190; y += 17 + Math.floor(r() * 6)) c.rect(x + 3, y, 2, 4, 'z-');
  }
  // canopy clumps
  for (let i = 0; i < 26; i++) {
    const x = r() * BG_W;
    const y = r() * 52;
    c.ellipse(x, y, 10 + r() * 14, 7 + r() * 8, i % 3 === 0 ? 'e' : 'f');
  }
  for (let i = 0; i < 16; i++) c.ellipse(r() * BG_W, r() * 36, 8 + r() * 8, 4 + r() * 5, 'l-');
  // bramble walls
  for (const side of [0, 1]) {
    for (let i = 0; i < 18; i++) {
      const y = 70 + i * 7 + r() * 5;
      const x = side === 0 ? r() * 20 : BG_W - r() * 20;
      c.ellipse(x, y, 12 + r() * 8, 6 + r() * 3, i % 2 ? 'f-' : 'z-');
      const dir = side === 0 ? 1 : -1;
      c.line(x, y, x + dir * (14 + r() * 8), y - 3 - r() * 5, 'z', 1);
      c.set(x + dir * 10, y - 4, 'r');
    }
  }
  // ground: mossy strip then calm dark
  for (let x = 0; x < BG_W; x++) {
    const h = 200 + Math.round(Math.sin(x * 0.07) * 2 + Math.sin(x * 0.21));
    for (let y = h; y < h + 8; y++) c.set(x, y, bayer(x, y) < (y - h) / 8 ? 'f-' : 'e-');
  }
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * BG_W);
    const y = 204 + Math.floor(r() * 36);
    c.set(x, y, 'f'); c.set(x + 1, y, 'f');
  }
  vignette(c, 'k', 0.9);
  return c;
}

function act2(): Canvas {
  const c = new Canvas(BG_W, BG_H);
  const r = rng(22);
  gradient(c, [[0, 'a-'], [60, 'a'], [150, 'a'], [200, 'a-'], [320, 'n-']]);
  lightShafts(c, 't', 190, 38, 6, -0.5);
  // pillars
  for (const [x, w] of [[14, 22], [76, 26], [146, 22]] as [number, number][]) {
    c.rect(x, 0, w, 205, 's');
    c.rect(x, 0, 4, 205, 'g');
    c.rect(x + w - 5, 0, 5, 205, 'k');
    c.rect(x - 3, 0, w + 6, 8, 'g');
    c.rect(x - 3, 8, w + 6, 2, 'k');
    for (let y = 30; y < 200; y += 24) c.rect(x, y, w, 2, 'k');
  }
  // arches between pillars
  for (const [x0, x1] of [[36, 76], [102, 146]] as [number, number][]) {
    const cx = (x0 + x1) / 2;
    const rr = (x1 - x0) / 2;
    for (let a = 0; a <= 180; a += 3) {
      const t = (a * Math.PI) / 180;
      c.rect(Math.round(cx + Math.cos(t) * rr), Math.round(40 - Math.sin(t) * 26), 4, 4, 'g');
    }
  }
  // hanging chains
  for (const x of [58, 118, 164]) {
    for (let y = 0; y < 70 + r() * 30; y += 4) {
      c.rect(x, y, 2, 3, 'g');
      c.set(x + 1, y + 1, 's');
    }
  }
  // water line and ripples
  for (let y = 205; y < 320; y++) for (let x = 0; x < BG_W; x++) c.set(x, y, bayer(x, y) < (y - 205) / 115 ? 'n-' : 'a-');
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * BG_W);
    const y = 205 + Math.floor(r() * 34);
    c.rect(x, y, 6 + Math.floor(r() * 8), 1, 'a');
  }
  c.rect(0, 203, BG_W, 2, 't');
  vignette(c, 'k', 0.8);
  return c;
}

function act3(): Canvas {
  const c = new Canvas(BG_W, BG_H);
  const r = rng(33);
  gradient(c, [[0, 'x-'], [90, 'k'], [200, 'k'], [320, 'k']]);
  // basalt columns
  for (let x = 0; x < BG_W; x += 18) {
    const w = 17;
    const top = Math.floor(r() * 30);
    c.rect(x, top, w, 210 - top, x % 36 === 0 ? 's' : 'k');
    c.rect(x, top, 3, 210 - top, 'g');
    c.rect(x + w - 4, top, 4, 210 - top, 'k');
    c.rect(x, top, w, 3, 'g');
  }
  // glowing cracks: random walks
  for (let i = 0; i < 9; i++) {
    let x = Math.floor(r() * BG_W);
    let y = Math.floor(r() * 40);
    for (let s = 0; s < 40 + Math.floor(r() * 50); s++) {
      c.set(x, y, s % 5 === 0 ? 'y' : 'o');
      c.set(x + 1, y, 'r');
      x += Math.floor(r() * 3) - 1;
      y += 1 + Math.floor(r() * 2);
      if (y > 205) break;
    }
  }
  // lower half: calm, dark basalt floor with a faint glow at the base
  for (let y = 205; y < 320; y++) for (let x = 0; x < BG_W; x++) {
    const t = (y - 205) / 115;
    c.set(x, y, y > 290 && bayer(x, y) < (y - 290) / 30 * 0.6 ? 'x-' : 'k');
    if (t < 0.05) c.set(x, y, 's');
  }
  c.rect(0, 204, BG_W, 2, 'o');
  for (let i = 0; i < 40; i++) c.set(Math.floor(r() * BG_W), 210 + Math.floor(r() * 100), i % 3 === 0 ? 'o' : 's');
  vignette(c, 'k', 0.6);
  return c;
}

function menu(): Canvas {
  const c = new Canvas(BG_W, BG_H);
  const r = rng(44);
  gradient(c, [[0, 'e-'], [120, 'f'], [220, 'f-'], [320, 'k']]);
  // felt weave
  for (let y = 0; y < BG_H; y += 4) for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < BG_W; x += 4) {
    if (r() < 0.5) c.set(x, y, y < 200 ? 'f' : 'f-');
  }
  // stitched mat border
  for (let x = 10; x < BG_W - 10; x += 4) { c.rect(x, 12, 2, 1, 'y'); c.rect(x, BG_H - 13, 2, 1, 'y-'); }
  for (let y = 12; y < BG_H - 12; y += 4) { c.rect(10, y, 1, 2, 'y'); c.rect(BG_W - 11, y, 1, 2, 'y-'); }
  // scattered dice (mostly in the upper half and corners)
  const dice: [number, number, string][] = [[26, 40, 'w'], [140, 62, 'r'], [60, 100, 'w'], [150, 130, 'b'], [20, 150, 'y'], [120, 26, 'v'], [100, 160, 'w']];
  for (const [x, y, col] of dice) {
    const s = 12;
    c.rect(x, y, s, s, col);
    c.rect(x, y, s, 1, `${col}+`);
    c.rect(x + s - 1, y + 1, 1, s - 1, `${col}-`);
    const pips = 1 + Math.floor(r() * 5);
    const spots: [number, number][] = [[3, 3], [7, 7], [3, 7], [7, 3], [5, 5]];
    for (let i = 0; i < pips; i++) { const p = spots[i] as [number, number]; c.rect(x + p[0], y + p[1], 2, 2, col === 'w' ? 'k' : 'w'); }
    c.rect(x + 1, y + s, s, 1, 'f-'); // shadow
  }
  // a fan of cards in the corner
  for (let i = 0; i < 4; i++) {
    const ox = 124 + i * 7;
    c.rect(ox, 86 - i * 2, 16, 22, 'w');
    c.rect(ox, 86 - i * 2, 16, 1, 'c');
    c.rect(ox + 2, 88 - i * 2, 3, 3, i % 2 ? 'r' : 'k');
  }
  vignette(c, 'k', 1.0);
  return c;
}

export function buildBackgrounds(): Map<string, Sprite> {
  const out = new Map<string, Sprite>();
  const add = (id: string, canvas: Canvas): void => {
    out.set(id, { canvas, ax: canvas.w / 2, ay: canvas.h / 2 });
  };
  add('bg.act1', act1());
  add('bg.act2', act2());
  add('bg.act3', act3());
  add('bg.menu', menu());
  return out;
}
