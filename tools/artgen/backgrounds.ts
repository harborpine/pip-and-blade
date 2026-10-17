/**
 * Backdrops (docs/flat-style.md section 7, with the lead's review): 390x844, drawn to cover.
 * Hints of place live only in the top band (y < about 120) and the far edges (x < 16, x > 374);
 * the play area (bubbles, tokens, bars, the tray) sits on one plain tone.
 * Soft = a palette colour at low opacity (no gradients, no blur).
 */
import { c } from './palette';
import { circle, g, path, rect, roundPoly, svgDoc } from './svg';

export const BG_W = 390;
export const BG_H = 844;

const base = (tint: string, op: number): string =>
  rect(0, 0, BG_W, BG_H, 0, { fill: c('slate') }) + rect(0, 0, BG_W, BG_H, 0, { fill: c(tint), 'fill-opacity': op });
const soft = (d: string, col: string, op: number): string => path(d, { fill: c(col), 'fill-opacity': op });

function dieShape(cx: number, cy: number, size: number, rot: number, op: number): string {
  const h = size / 2;
  const pip = size * 0.1;
  return g({ transform: `rotate(${rot} ${cx} ${cy})` },
    path(roundPoly([[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]], size * 0.22), { fill: c('ivory'), 'fill-opacity': op }) +
    circle(cx - size * 0.24, cy - size * 0.24, pip, { fill: c('slate') }) + circle(cx, cy, pip, { fill: c('slate') }) + circle(cx + size * 0.24, cy + size * 0.24, pip, { fill: c('slate') }));
}

export const BACKGROUNDS: Readonly<Record<string, () => string>> = {
  // Thornwood: a leafy canopy along the top, a faint warm light above it.
  'bg.act1': () =>
    base('green', 0.06) +
    circle(195, -40, 150, { fill: c('gold'), 'fill-opacity': 0.05 }) +
    soft('M0 0H390V92C356 72 326 112 284 96C244 80 214 120 170 102C128 86 98 118 58 102C34 92 14 104 0 100Z', 'green', 0.17) +
    soft('M0 0H390V52C360 40 330 66 292 54C252 42 226 70 186 58C146 46 116 70 76 58C46 50 22 62 0 58Z', 'green', 0.12),
  // Sunken Vault: a row of flooded arches across the top with a teal waterline.
  'bg.act2': () =>
    base('teal', 0.06) +
    path('M0 0H390V112H0Z' + [-10, 120, 250, 380].map((x) => `M${x - 46} 112V66A46 46 0 0 1 ${x + 46} 66V112Z`).join(''), { fill: c('slate-2'), 'fill-opacity': 0.8, 'fill-rule': 'evenodd' }) +
    soft('M0 104H390V112H0Z', 'teal', 0.18),
  // Cinder Spire: an ember glow at the top above jagged dark basalt peaks.
  'bg.act3': () =>
    base('ink', 0.3) +
    soft('M0 0H390V64L362 98L336 62L300 108L268 66L236 100L200 52L168 104L132 64L98 102L64 58L32 92L0 62Z', 'ember', 0.16) +
    soft('M0 0H390V30L362 52L336 34L300 60L268 38L236 56L200 26L168 58L132 36L98 56L64 30L32 50L0 34Z', 'ember', 0.1),
  // Menus: a calm slate field with three large faint ivory dice.
  'bg.menu': () =>
    base('ink', 0.1) +
    dieShape(40, 96, 120, -14, 0.06) + dieShape(372, 330, 140, 18, 0.05) + dieShape(36, 720, 130, 10, 0.05),
};

export function backgroundSvg(id: string): string {
  const f = BACKGROUNDS[id];
  if (!f) throw new Error(`No background: ${id}`);
  return svgDoc(BG_W, BG_H, f(), { preserveAspectRatio: 'xMidYMid slice' });
}

export const backgroundBody = (id: string): string => {
  const f = BACKGROUNDS[id];
  if (!f) throw new Error(`No background: ${id}`);
  return f();
};
