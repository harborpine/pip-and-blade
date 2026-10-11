/**
 * The one shared palette: 24 base colours. Every pixel the generator writes is one of
 * these colours in one of exactly three shades (light, medium, dark). Nothing else.
 */
export const PALETTE: Record<string, string> = {
  k: '#1b1730', // ink (outline)
  s: '#4b5169', // slate
  g: '#9099b0', // steel
  w: '#f6f3ea', // white
  c: '#e8dcb8', // cream / bone
  r: '#e5463f', // red
  x: '#9e2b45', // crimson
  o: '#f28a2e', // orange
  y: '#f6c833', // gold
  l: '#8bd23f', // lime
  e: '#2f9d50', // green
  f: '#1e6342', // forest
  t: '#2cb6a9', // teal
  a: '#146a78', // deep teal
  b: '#4ba6f2', // sky blue
  n: '#2d4aa6', // navy
  i: '#4d3b9e', // indigo
  v: '#9a5fdc', // violet
  p: '#cbb0f2', // pale violet
  m: '#dd58a4', // magenta
  q: '#f5a9bd', // pink
  h: '#dba76a', // tan
  u: '#8c5a36', // brown
  z: '#5a3a2a', // mud
};

export const PALETTE_KEYS = Object.keys(PALETTE);
export const INK = 'k';

export type Shade = 'top' | 'mid' | 'dark';

type Rgb = [number, number, number];

const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
const pack = (c: Rgb): number => (c[0] << 16) | (c[1] << 8) | c[2];

const WHITE: Rgb = [255, 255, 255];
const SHADOW: Rgb = hex('#1b1730');

/** The RGB of a palette key at a shade. Light = lifted towards white, dark = pushed towards ink. */
export function shadeRgb(key: string, shade: Shade): Rgb {
  const hexv = PALETTE[key];
  if (!hexv) throw new Error(`Unknown palette key "${key}"`);
  const base = hex(hexv);
  if (shade === 'mid') return base;
  if (shade === 'top') return mix(base, WHITE, 0.3);
  return mix(base, SHADOW, 0.38);
}

/**
 * A colour reference used by drawing code: a palette key, optionally followed by "+" (light) or "-" (dark).
 * Examples: "r", "r+", "r-". Returns packed 0xRRGGBB.
 */
export function colorOf(spec: string): number {
  const key = spec[0] ?? '';
  const mark = spec[1];
  const shade: Shade = mark === '+' ? 'top' : mark === '-' ? 'dark' : 'mid';
  return pack(shadeRgb(key, shade));
}

/** Every colour the generator may emit (24 keys x 3 shades), packed 0xRRGGBB. */
export function allowedColors(): Set<number> {
  const s = new Set<number>();
  for (const k of PALETTE_KEYS) for (const sh of ['top', 'mid', 'dark'] as const) s.add(pack(shadeRgb(k, sh)));
  return s;
}

export const shadeTop = (k: string): number => pack(shadeRgb(k, 'top'));
export const shadeMid = (k: string): number => pack(shadeRgb(k, 'mid'));
export const shadeDark = (k: string): number => pack(shadeRgb(k, 'dark'));
