/**
 * The code-generated pixel fonts (interface kit, render: 'kit').
 *
 *  - small: a chunky 7 px tall face (2 px stems), capitals, digits and punctuation. One atlas in
 *    ink and one in ivory with identical metrics.
 *  - big: 12 px tall block digits with a 1 px ink edge built in (white inside), for dice values,
 *    HP and damage pops. Readable on any colour.
 *
 * Like the rest of the kit, one native pixel is meant to be shown as 2 CSS px.
 */
import { Canvas } from './canvas';
import type { Sprite } from './sheet';

export interface Glyph { x: number; y: number; w: number; h: number; advance: number }
export interface FontInfo {
  /** Sprite ids of the atlases that share these metrics, by colour. */
  sprites: Record<string, string>;
  /** Glyph height in native pixels. */
  height: number;
  /** Advance of a space, native pixels. */
  space: number;
  glyphs: Record<string, Glyph>;
}

const g = (s: string): string[] => s.split('|');

const SMALL: Record<string, string[]> = {
  A: g('.####.|##..##|##..##|######|##..##|##..##|##..##'),
  B: g('#####.|##..##|##..##|#####.|##..##|##..##|#####.'),
  C: g('.####.|##..##|##....|##....|##....|##..##|.####.'),
  D: g('####..|##.##.|##..##|##..##|##..##|##.##.|####..'),
  E: g('######|##....|##....|#####.|##....|##....|######'),
  F: g('######|##....|##....|#####.|##....|##....|##....'),
  G: g('.####.|##..##|##....|##.###|##..##|##..##|.#####'),
  H: g('##..##|##..##|##..##|######|##..##|##..##|##..##'),
  I: g('####|.##.|.##.|.##.|.##.|.##.|####'),
  J: g('..####|....##|....##|....##|....##|##..##|.####.'),
  K: g('##..##|##.##.|####..|###...|####..|##.##.|##..##'),
  L: g('##....|##....|##....|##....|##....|##....|######'),
  M: g('##...##|###.###|#######|##.#.##|##...##|##...##|##...##'),
  N: g('##..##|###.##|###.##|######|##.###|##.###|##..##'),
  O: g('.####.|##..##|##..##|##..##|##..##|##..##|.####.'),
  P: g('#####.|##..##|##..##|#####.|##....|##....|##....'),
  Q: g('.####.|##..##|##..##|##..##|##.###|.####.|....##'),
  R: g('#####.|##..##|##..##|#####.|####..|##.##.|##..##'),
  S: g('.#####|##....|##....|.####.|....##|....##|#####.'),
  T: g('######|..##..|..##..|..##..|..##..|..##..|..##..'),
  U: g('##..##|##..##|##..##|##..##|##..##|##..##|.####.'),
  V: g('##...##|##...##|##...##|.##.##.|.##.##.|..###..|...#...'),
  W: g('##...##|##...##|##...##|##.#.##|##.#.##|#######|.##.##.'),
  X: g('##..##|##..##|.####.|..##..|.####.|##..##|##..##'),
  Y: g('##..##|##..##|.####.|..##..|..##..|..##..|..##..'),
  Z: g('######|....##|...##.|..##..|.##...|##....|######'),
  0: g('.####.|##..##|##.###|###.##|##..##|##..##|.####.'),
  1: g('..##.|.###.|..##.|..##.|..##.|..##.|.####'),
  2: g('.####.|##..##|....##|...##.|..##..|.##...|######'),
  3: g('#####.|....##|....##|.####.|....##|....##|#####.'),
  4: g('...###|..####|.##.##|##..##|######|....##|....##'),
  5: g('######|##....|#####.|....##|....##|##..##|.####.'),
  6: g('.####.|##....|##....|#####.|##..##|##..##|.####.'),
  7: g('######|....##|...##.|..##..|..##..|..##..|..##..'),
  8: g('.####.|##..##|##..##|.####.|##..##|##..##|.####.'),
  9: g('.####.|##..##|##..##|.#####|....##|....##|.####.'),
  '.': g('..|..|..|..|..|##|##'),
  ',': g('...|...|...|...|.##|.##|##.'),
  '!': g('##|##|##|##|..|##|##'),
  '?': g('.####.|##..##|....##|..###.|..##..|......|..##..'),
  ':': g('..|##|##|..|##|##|..'),
  ';': g('...|.##|.##|...|.##|.##|##.'),
  "'": g('##|##|.#|..|..|..|..'),
  '"': g('##.##|##.##|.#..#|.....|.....|.....|.....'),
  '-': g('....|....|....|####|....|....|....'),
  '+': g('......|..##..|..##..|######|..##..|..##..|......'),
  '/': g('...##|...##|..##.|..##.|.##..|##...|##...'),
  '%': g('##...#|##..##|...##.|..##..|.##...|##..##|#...##'),
  '(': g('.##|##.|##.|##.|##.|##.|.##'),
  ')': g('##.|.##|.##|.##|.##|.##|##.'),
  '&': g('.###...|##.##..|##.##..|.###...|##.##.#|##..##.|.###.##'),
  '×': g('.....|.....|##.##|.###.|..#..|.###.|##.##'),
  '→': g('.......|...##..|....##.|#######|....##.|...##..|.......'),
};

function drawGlyph(c: Canvas, rows: string[], x: number, y: number, spec: string): void {
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') c.set(x + i, y + j, spec); }));
}

function smallAtlas(spec: string): { canvas: Canvas; glyphs: Record<string, Glyph> } {
  const keys = Object.keys(SMALL);
  const PER = 16;
  const c = new Canvas(PER * 8, Math.ceil(keys.length / PER) * 8);
  const glyphs: Record<string, Glyph> = {};
  keys.forEach((k, n) => {
    const rows = SMALL[k] as string[];
    const w = (rows[0] as string).length;
    if (rows.length !== 7 || rows.some((r) => r.length !== w) || w > 7) throw new Error(`font glyph "${k}" is malformed`);
    const x = (n % PER) * 8;
    const y = Math.floor(n / PER) * 8;
    drawGlyph(c, rows, x, y, spec);
    glyphs[k] = { x, y, w, h: 7, advance: w + 1 };
  });
  return { canvas: c, glyphs };
}

// ------------------------------------------------------------------ big block digits

const BW = 8;
const BH = 12;

/** Seven-segment style blocks: bars 2 px thick, stems 3 px thick, outer corners knocked off. */
function segDigit(seg: string): string[] {
  const px = Array.from({ length: BH }, () => Array<string>(BW).fill('.'));
  const fill = (x0: number, y0: number, x1: number, y1: number): void => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) (px[y] as string[])[x] = '#';
  };
  if (seg.includes('a')) fill(0, 0, 7, 1);
  if (seg.includes('g')) fill(0, 5, 7, 6);
  if (seg.includes('d')) fill(0, 10, 7, 11);
  if (seg.includes('f')) fill(0, 0, 2, 6);
  if (seg.includes('b')) fill(5, 0, 7, 6);
  if (seg.includes('e')) fill(0, 5, 2, 11);
  if (seg.includes('c')) fill(5, 5, 7, 11);
  for (const [x, y] of [[0, 0], [7, 0], [0, 11], [7, 11]] as [number, number][]) (px[y] as string[])[x] = '.';
  return px.map((r) => r.join(''));
}

const BIG: Record<string, string[]> = {
  0: segDigit('abcdef'),
  1: g('..###...|.####...|#####...|..###...|..###...|..###...|..###...|..###...|..###...|..###...|########|########'),
  2: g('.######.|########|###..###|.....###|.....###|....###.|...###..|..###...|.###....|###.....|########|########'),
  3: g('.######.|########|##...###|.....###|.....###|..#####.|..#####.|.....###|.....###|##...###|########|.######.'),
  4: g('....####|...#####|..###.##|.###..##|###...##|###...##|########|########|......##|......##|......##|......##'),
  5: g('########|########|###.....|###.....|######..|#######.|.....###|.....###|.....###|###..###|########|.######.'),
  6: g('..#####.|.######.|###.....|###.....|###.....|#######.|########|###..###|###..###|###..###|########|.######.'),
  7: g('.#######|########|.....###|.....###|....###.|....###.|...###..|...###..|..###...|..###...|..###...|..###...'),
  8: g('.######.|########|###..###|###..###|###..###|.######.|.######.|###..###|###..###|###..###|########|.######.'),
  9: g('.######.|########|###..###|###..###|###..###|########|.#######|.....###|.....###|.....###|.######.|.#####..'),
  '+': g('........|........|...##...|...##...|...##...|########|########|...##...|...##...|...##...|........|........'),
  '-': g('........|........|........|........|........|.######.|.######.|........|........|........|........|........'),
  '/': g('......##|......##|.....##.|.....##.|....##..|....##..|...##...|...##...|..##....|..##....|.##.....|.##.....'),
};

function bigAtlas(): { canvas: Canvas; glyphs: Record<string, Glyph> } {
  const keys = Object.keys(BIG);
  const pitch = BW + 3;
  const inner = new Canvas(keys.length * pitch, BH + 2);
  const glyphs: Record<string, Glyph> = {};
  keys.forEach((k, n) => {
    drawGlyph(inner, BIG[k] as string[], n * pitch + 1, 1, 'w');
    glyphs[k] = { x: n * pitch, y: 0, w: BW + 2, h: BH + 2, advance: BW + 1 };
  });
  return { canvas: inner.outline(), glyphs };
}

export interface Fonts {
  sprites: Map<string, Sprite>;
  info: { small: FontInfo; big: FontInfo };
}

export function buildFonts(): Fonts {
  const ink = smallAtlas('k');
  const ivory = smallAtlas('c');
  const big = bigAtlas();
  const sp = (canvas: Canvas): Sprite => ({ canvas, ax: 0, ay: 0, render: 'kit' });
  return {
    sprites: new Map([['kit.font', sp(ink.canvas)], ['kit.font_ivory', sp(ivory.canvas)], ['kit.font_big', sp(big.canvas)]]),
    info: {
      small: { sprites: { ink: 'kit.font', ivory: 'kit.font_ivory' }, height: 7, space: 4, glyphs: ink.glyphs },
      big: { sprites: { white: 'kit.font_big' }, height: BH + 2, space: 5, glyphs: big.glyphs },
    },
  };
}

/** Draw text with a font atlas onto a canvas (used by the mock and the gallery sheet). Returns the width drawn. */
export function drawText(dst: Canvas, atlas: Canvas, info: FontInfo, text: string, x: number, y: number): number {
  let cx = x;
  for (const ch of text) {
    const gl = info.glyphs[ch] ?? info.glyphs[ch.toUpperCase()];
    if (!gl) { cx += info.space; continue; }
    dst.blit(atlas.crop(gl.x, gl.y, gl.w, gl.h), cx, y);
    cx += gl.advance;
  }
  return cx - x;
}

export function textWidth(info: FontInfo, text: string): number {
  let w = 0;
  for (const ch of text) w += (info.glyphs[ch] ?? info.glyphs[ch.toUpperCase()])?.advance ?? info.space;
  return w;
}
