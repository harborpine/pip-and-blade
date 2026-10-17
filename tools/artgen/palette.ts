/**
 * The one shared palette for 0.3.0 (docs/flat-style.md section 2).
 * Every colour in every generated SVG must come from here (tested).
 */
import type { HeroId } from '../../src/shared/roster';

/** Interface and shared roles (fixed by the spec). */
export const BASE = {
  ink: '#1c2430',
  'ink-soft': '#55606b',
  ivory: '#f4ecd8',
  'ivory-dim': '#e2d6ba',
  paper: '#fbf7ec',
  slate: '#243640',
  'slate-2': '#304753',
  'slate-3': '#6b828d',
  gold: '#f2c230',
  'gold-ink': '#4a3500',
  red: '#e0483f',
  green: '#3fae5a',
  blue: '#3f8fe0',
  purple: '#8a5fd1',
  lime: '#7fbf3a',
} as const;

/** Extra drawing colours for characters, items and scenes (chosen by art; total palette stays at most 28). */
export const EXTRA = {
  brown: '#9a6a43',
  ember: '#ee7d2b',
  teal: '#35b5a6',
  pink: '#ee9aa6',
  stone: '#a89d8f',
} as const;

/** One colour per hero: each at least 3:1 against ivory (icons sit on the ivory die face in this colour). */
export const HERO_COLOR: Readonly<Record<HeroId, string>> = {
  bulwark: '#2f6db3',
  duelist: '#c43a32',
  herbalist: '#2c8a3e',
  gambler: '#7748c2',
  redhand: '#b9561b',
  automaton: '#1a8580',
  grower: '#68751c',
  hexer: '#ae3a8c',
};

export type ColorName = keyof typeof BASE | keyof typeof EXTRA | `hero-${HeroId}`;

/** name -> hex, in a fixed order. */
export const PALETTE: Readonly<Record<string, string>> = {
  ...BASE,
  ...EXTRA,
  ...Object.fromEntries(Object.entries(HERO_COLOR).map(([k, v]) => [`hero-${k}`, v])),
};

/** Look up a palette colour by name; throws on a typo so no stray colour can slip in. */
export function c(name: string): string {
  const hex = PALETTE[name];
  if (!hex) throw new Error(`Not a palette colour: ${name}`);
  return hex;
}

function lin(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}
