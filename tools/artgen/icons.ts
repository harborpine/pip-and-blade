/**
 * The icon family (docs/flat-style.md section 5): 24x24 grid, solid shapes in currentColor
 * (ui tints them as CSS masks), corners rounded about 1-2 units.
 * Rules every icon follows:
 *   - the object fills roughly the 2.5..21.5 box (round things a little bigger, for equal weight);
 *   - masses are filled; anything thin (shackles, arcs, chains, cracks) is a 3-unit round-capped
 *     stroke (2.6 for small parts), never thinner;
 *   - holes and cut gaps are at least 2 units so they survive at 16-20px;
 *   - one object per icon, a bold single silhouette that reads at 16px.
 * Cuts that would need overlapping holes use an SVG <mask> (alpha only, so masks still tint).
 */
import { circleD, g, line, path, rectD, roundPoly, svgDoc, xform } from './svg';
import type { Pt } from './svg';

export const ICON_SIZE = 24;
const EO = { 'fill-rule': 'evenodd' };
const P = (d: string): string => path(d);

/** Scale an absolute path that only uses M/L/Q/C/Z (coordinate pairs) about a centre. */
export function scaleD(d: string, s: number, cx = 12, cy = 12, dx = 0, dy = 0): string {
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (m) => {
    const v = Number(m);
    const out = i % 2 === 0 ? cx + dx + (v - cx) * s : cy + dy + (v - cy) * s;
    i++;
    return String(Math.round(out * 100) / 100);
  });
}

/** Rotate an absolute M/L/Q/C/Z path about a centre. */
export function rotateD(d: string, deg: number, cx = 12, cy = 12): string {
  const nums = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const pts: Pt[] = [];
  for (let k = 0; k < nums.length; k += 2) pts.push([nums[k]!, nums[k + 1]!]);
  const r = xform(pts, deg, 1, cx, cy);
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, () => {
    const p = r[i >> 1]!;
    const v = p[i % 2]!;
    i++;
    return String(Math.round(v * 100) / 100);
  });
}

/** Cut `remove` (drawn in black) out of `keep`, via a mask with a unique id. */
function cut(id: string, keep: string, remove: string): string {
  const mid = `m-${id.replace(/[^a-z0-9]/gi, '-')}`;
  return `<mask id="${mid}" maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28"><rect x="-2" y="-2" width="28" height="28" fill="white"/><g fill="black">${remove}</g></mask><g mask="url(#${mid})">${keep}</g>`;
}
/** A black stroke for a cut. */
const cutLine = (d: string, w: number): string =>
  path(d, { fill: 'none', stroke: 'black', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

// ------------------------------------------------------------------ shared shapes

/** A straight sword pointing up, centred on x=12, tip at y≈1.8, pommel at y≈23.6. */
function swordD(bw = 4.2): string {
  const h = bw / 2;
  return [
    roundPoly([[12 - h, 15], [12 - h, 6.4], [12, 1.8], [12 + h, 6.4], [12 + h, 15]], [0.4, 0.9, 0.7, 0.9, 0.4]),
    rectD(5.6, 14.2, 12.8, 3.8, 1.9),
    rectD(10.6, 17, 2.8, 3.6, 0.5),
    circleD(12, 21.2, 2.4),
  ].join('');
}
/** Short broad sword for the set symbol (reads at 14px). */
function shortSwordD(): string {
  return [
    roundPoly([[9.2, 14], [9.2, 6.2], [12, 2.4], [14.8, 6.2], [14.8, 14]], [0.5, 1, 0.8, 1, 0.5]),
    rectD(5, 13.4, 14, 3.4, 1.7),
    rectD(10.6, 16, 2.8, 4, 0.6),
    circleD(12, 20.6, 2.3),
  ].join('');
}
/** A wide-bladed war sword (intent.attack): a broad leaf blade so it reads heavier than a rapier. */
function broadSwordD(): string {
  return [
    roundPoly([[9.4, 14.6], [8.8, 7], [12, 1.6], [15.2, 7], [14.6, 14.6]], [0.4, 1.6, 0.8, 1.6, 0.4]),
    rectD(4.8, 13.8, 14.4, 4, 2),
    rectD(10.5, 16.6, 3, 3.6, 0.5),
    circleD(12, 21.2, 2.5),
  ].join('');
}

const HEATER = 'M5.2 3.2L18.8 3.2Q20.6 3.2 20.6 5L20.6 10.6C20.6 15.6 17 19.4 12 21.8C7 19.4 3.4 15.6 3.4 10.6L3.4 5Q3.4 3.2 5.2 3.2Z';
const KITE = 'M12 2.4C15.2 2.4 18 3.2 19.4 4.4Q20 5 20 6L20 10C20 15 16.4 19 12 22C7.6 19 4 15 4 10L4 6Q4 5 4.6 4.4C6 3.2 8.8 2.4 12 2.4Z';
const HEART = 'M12 21C7 17.4 2.4 13.8 2.4 8.9C2.4 5.9 4.7 3.6 7.5 3.6C9.4 3.6 11.1 4.7 12 6.4C12.9 4.7 14.6 3.6 16.5 3.6C19.3 3.6 21.6 5.9 21.6 8.9C21.6 13.8 17 17.4 12 21Z';
const DROP = 'M12 2.2C12 2.2 19.4 9.8 19.4 14.6A7.4 7.4 0 0 1 4.6 14.6C4.6 9.8 12 2.2 12 2.2Z';
const PLUS: Pt[] = [[9, 2.8], [15, 2.8], [15, 9], [21.2, 9], [21.2, 15], [15, 15], [15, 21.2], [9, 21.2], [9, 15], [2.8, 15], [2.8, 9], [9, 9]];
const SKULL = 'M12 2.8C17 2.8 20.5 6.3 20.5 10.8C20.5 13.6 19.2 15.6 17.2 16.8L17.2 19.4Q17.2 21.2 15.4 21.2L8.6 21.2Q6.8 21.2 6.8 19.4L6.8 16.8C4.8 15.6 3.5 13.6 3.5 10.8C3.5 6.3 7 2.8 12 2.8Z';
const FLAME = 'M12 2.2C15 6 19 9.6 19 14.6C19 18.5 15.9 21.6 12 21.6C8.1 21.6 5 18.5 5 14.6C5 11.4 7 9 8.6 7.6C8.8 9.8 9.6 11.2 11 12C11 8.4 11.4 5.2 12 2.2Z';

/** A plus as a polygon centred at (cx, cy), arm length l from centre, arm width w. */
function plusPts(cx: number, cy: number, l: number, w: number): Pt[] {
  const h = w / 2;
  return [[cx - h, cy - l], [cx + h, cy - l], [cx + h, cy - h], [cx + l, cy - h], [cx + l, cy + h], [cx + h, cy + h], [cx + h, cy + l], [cx - h, cy + l], [cx - h, cy + h], [cx - l, cy + h], [cx - l, cy - h], [cx - h, cy - h]];
}

/** An n-point star polygon. */
function starPts(n: number, ro: number, ri: number, cx = 12, cy = 12, rot = -90): Pt[] {
  const pts: Pt[] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = ((rot + (k * 180) / n) * Math.PI) / 180;
    const r = k % 2 === 0 ? ro : ri;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

/** A bold arrow pointing up, as one polygon: tip at (cx, top), shaft to bottom. */
function arrowPts(cx: number, top: number, bottom: number, hw = 8, hh = 8, sw = 5): Pt[] {
  const s = sw / 2;
  return [[cx, top], [cx + hw, top + hh], [cx + s, top + hh], [cx + s, bottom], [cx - s, bottom], [cx - s, top + hh], [cx - hw, top + hh]];
}

/** Circular arrow: an open ring (radius r), travelling clockwise, arrowhead at its end. */
function cycleArrow(r = 7.4, w = 3): string {
  const rad = (d: number): number => (d * Math.PI) / 180;
  const at = (d: number): Pt => [12 + r * Math.cos(rad(d)), 12 + r * Math.sin(rad(d))];
  const a0 = -60;
  const a1 = 200;
  const [sx, sy] = at(a0);
  const [ex, ey] = at(a1);
  const arc = line(`M${sx.toFixed(2)} ${sy.toFixed(2)}A${r} ${r} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`, w);
  const t: Pt = [-Math.sin(rad(a1)), Math.cos(rad(a1))];
  const nrm: Pt = [Math.cos(rad(a1)), Math.sin(rad(a1))];
  const tip: Pt = [ex + t[0] * 4.6, ey + t[1] * 4.6];
  const b1: Pt = [ex - t[0] * 0.6 + nrm[0] * 4.2, ey - t[1] * 0.6 + nrm[1] * 4.2];
  const b2: Pt = [ex - t[0] * 0.6 - nrm[0] * 4.2, ey - t[1] * 0.6 - nrm[1] * 4.2];
  return arc + path(roundPoly([tip, b1, b2], 0.9));
}

/** Padlock body with keyhole, and the two shackles. */
const lockBody = (): string => path(rectD(4.2, 10.4, 15.6, 11.4, 2.6) + circleD(12, 14.9, 1.7) + rectD(11.1, 15.4, 1.8, 3.6, 0.6), EO);
const shackleClosed = (): string => line('M7.8 10.6L7.8 7.8A4.2 4.2 0 0 1 16.2 7.8L16.2 10.6', 3);

/** A diagonal sword with a small bold arrow at its lower right (down = weaker, up = stronger), cut free by a gap. */
function swordWithArrow(id: string, up: boolean): string {
  const sword = P(scaleD(rotateD(swordD(4.4), 45), 0.92, 12, 12, -1.6, -1.6));
  const pts = arrowPts(18, 11.4, 22.6, 5.2, 5.4, 3.4);
  const arrowD = roundPoly(up ? pts : xform(pts, 180, 1, 18, 17), 0.6);
  return cut(id, sword, path(arrowD, { stroke: 'black', 'stroke-width': 3.6, 'stroke-linejoin': 'round' })) + P(arrowD);
}

/** A question mark as a black cut stroke centred at (cx, cy), scale s. */
const questionCut = (cx: number, cy: number, s: number): string =>
  cutLine(`M${cx - 2.6 * s} ${cy - 2.6 * s}A${2.7 * s} ${2.7 * s} 0 1 1 ${cx + 0.6 * s} ${cy + 0.1 * s}Q${cx} ${cy + 0.6 * s} ${cx} ${cy + 1.8 * s}`, 2.4) +
  path(circleD(cx, cy + 4.6 * s, 1.4));

const tray = (): string => line('M4 13.5L4 18.8Q4 20.6 5.8 20.6L18.2 20.6Q20 20.6 20 18.8L20 13.5', 3);
const dieSquare = (x: number, y: number, s: number, r: number): string => rectD(x, y, s, s, r);

// ------------------------------------------------------------------ the icons

export const ICONS: Readonly<Record<string, string>> = {
  // set symbols (die corner marks, 13-14px)
  'sym.blade': P(shortSwordD()),
  'sym.guard': P(KITE),
  'sym.heart': P(HEART),
  'sym.spark': P(roundPoly(starPts(4, 10.4, 3.6), 0.8)),
  'sym.skull': path(SKULL + circleD(8.9, 11, 2.4) + circleD(15.1, 11, 2.4) + roundPoly([[12, 13.8], [13.4, 16.4], [10.6, 16.4]], 0.4), EO),

  // face effects (the big icon on a die, 32-34px; also 16-20px in text)
  'fx.damage': P(scaleD(rotateD(swordD(4.4), 45), 1.16)),
  'fx.shield': path(HEATER + rectD(10.8, 6, 2.4, 12.4, 1.2), EO),
  'fx.heal': P(roundPoly(PLUS, 1.6)),
  'fx.weaken': swordWithArrow('fx.weaken', false),
  'fx.focus': cycleArrow() + P(roundPoly(plusPts(12, 12, 3.6, 2.6), 0.5)),
  'fx.blank': P(rectD(4.5, 10, 15, 4, 2)),

  // keywords (16-18px, ink, along the die's bottom edge)
  'kw.cleave': P('M1.8 19.4C2.4 9.4 8.4 2.6 16.6 2.6C19 2.6 21 3.2 22.4 4.6C15.8 5.6 10.8 11 9.6 19.4Q5.6 21.6 1.8 19.4Z'),
  'kw.echo': P(rectD(2.6, 7.4, 9.2, 9.2, 2.2)) + line('M14.8 7.2A6.6 6.6 0 0 1 14.8 16.8', 2.8) + line('M18.4 4.2A10.4 10.4 0 0 1 18.4 19.8', 2.8),
  'kw.growth': line('M12 21.6L12 11', 3) + P('M11.4 13.4C6.2 13.4 2.8 10.4 2.8 5.4C8 5.4 11.4 8.4 11.4 13.4Z') + P('M12.6 11.2C12.6 5.8 15.6 2.6 21.2 2.6C21.2 8 18 11.2 12.6 11.2Z'),
  'kw.reckless': cut('kw.reckless', P(HEART), cutLine('M12 5.4L9.6 9.6L13.6 12.6L10.4 17L12 22', 2.2)),
  'kw.pierce': cut('kw.pierce', P(rectD(12.6, 2.6, 4.4, 18.8, 1.4)), P(rectD(10, 9.2, 10, 5.6, 0))) +
    line('M2.6 12L16.8 12', 3) + P(roundPoly([[22, 12], [15.6, 6.4], [15.6, 17.6]], 0.9)),
  'kw.venom': P(DROP),
  'kw.ward': path(HEATER + circleD(12, 10, 2.4) + roundPoly([[11, 11.4], [13, 11.4], [13.8, 16.4], [10.2, 16.4]], 0.6), EO),
  'kw.twin': cut('kw.twin', P(dieSquare(2.4, 2.4, 12.4, 3)), P(dieSquare(7.4, 7.4, 16, 4.2))) + P(dieSquare(9.4, 9.4, 12.2, 3)),
  'kw.rally': line('M5 21.6L5 3', 3) + path(roundPoly([[5, 3], [20.4, 3], [17, 8.6], [20.4, 14.2], [5, 14.2]], 1) + roundPoly(plusPts(11.6, 8.6, 3.2, 2.2), 0.3), EO),
  'kw.momentum': P(roundPoly([[13.2, 3.6], [22, 12], [13.2, 20.4], [13.2, 15.2], [7.6, 15.2], [7.6, 8.8], [13.2, 8.8]], 1.2)) + line('M2.6 8.8L4.4 8.8', 2.6) + line('M2.6 15.2L4.4 15.2', 2.6),
  'kw.poised': P(rectD(10.7, 4, 2.6, 15.6, 0.8) + rectD(5.4, 18.6, 13.2, 3, 1.5) + rectD(2.4, 4.6, 19.2, 2.6, 1.3)) +
    P('M1.6 13L5.4 7.2L9.2 13A3.8 3.8 0 0 1 1.6 13Z') + P('M14.8 13L18.6 7.2L22.4 13A3.8 3.8 0 0 1 14.8 13Z'),
  'kw.execute': g({ transform: 'rotate(-30 12 12)' }, line('M9.6 1.8L9.6 22.6', 3) + P('M8.4 4.6L14 3.4C18.8 3 21.8 6.4 21.8 8.8C21.8 11.2 18.8 14.6 14 14.2L8.4 13Z')),

  // statuses (16-20px chips)
  'status.poison': path(DROP + circleD(9.6, 15, 1.7) + circleD(14.4, 15, 1.7), EO),
  'status.weak': swordWithArrow('status.weak', false),
  'status.strength': swordWithArrow('status.strength', true),
  'status.thorns': path(roundPoly(starPts(8, 11, 6.6), 0.7) + circleD(12, 12, 3.4), EO),
  'status.regen': path('M3.4 20.6C3.4 10.4 9.6 3.8 20.6 3.4C20.2 14.2 13.6 20.6 3.4 20.6Z' + roundPoly(plusPts(12.4, 11.6, 3.6, 2.4), 0.4), EO),
  'status.mark': path(circleD(12, 12, 9.8) + circleD(12, 12, 6.8), EO) + P(circleD(12, 12, 3.8)),

  // die marks
  'die.jammed': g({ transform: 'rotate(-45 12 12)' },
    path(rectD(1.6, 8.4, 12, 7.2, 3.6) + rectD(4.6, 10.9, 6, 2.2, 1.1), EO) +
    path(rectD(10.4, 8.4, 12, 7.2, 3.6) + rectD(13.4, 10.9, 6, 2.2, 1.1), EO)),
  'die.cursed': line('M14.5 2.6L9 8.8L15 12.6L9.4 17.4L12.6 21.4', 3.2),

  // enemy intentions (20px in the speech bubble)
  'intent.attack': P(rotateD(broadSwordD(), 180)),
  'intent.attack_all': P(roundPoly([[5.6, 2.6], [8.4, 2.6], [5, 21.4], [3.4, 21.4]], [1.2, 1.2, 0.6, 0.6])) +
    P(roundPoly([[10.6, 2.6], [13.4, 2.6], [12.8, 21.4], [11.2, 21.4]], [1.2, 1.2, 0.6, 0.6])) +
    P(roundPoly([[15.6, 2.6], [18.4, 2.6], [20.6, 21.4], [19, 21.4]], [1.2, 1.2, 0.6, 0.6])),
  'intent.shield': P(HEATER),
  'intent.heal': P(roundPoly(PLUS, 1.6)),
  'intent.buff': P(roundPoly(arrowPts(10, 3, 21.4, 7.6, 8, 5.4), 1)) + P(roundPoly(starPts(4, 4.2, 1.5, 19, 5.2), 0.4)),
  'intent.debuff': P(rotateD(roundPoly(arrowPts(12, 2.6, 21.4, 8.6, 8.6, 5.6), 1), 180)),
  'intent.lockDie': cut('intent.lockDie', path(dieSquare(2.4, 2.4, 15.6, 3.6) + circleD(6.8, 6.8, 1.8) + circleD(14, 14, 1.8), EO), P(rectD(9.6, 9, 15, 15, 3))) +
    line('M13.4 13.6L13.4 12A3 3 0 0 1 19.4 12L19.4 13.6', 2.6) + P(rectD(11.4, 13.4, 10, 8.4, 1.8)),
  'intent.curseFace': cut('intent.curseFace', P(dieSquare(2.8, 2.8, 18.4, 4.2)), cutLine('M13.6 1.4L9.6 8.4L14.4 12.2L10 17.6L11.6 23', 2.4)),
  'intent.stealReroll': cycleArrow() + P(rectD(8.4, 10.8, 7.2, 2.6, 1.3)),
  'intent.summon': P(circleD(9.6, 8.4, 4.4) + 'M2.6 21.6L2.6 18.8C2.6 15.4 5.4 13.6 9.6 13.6C13.8 13.6 16.6 15.4 16.6 18.8L16.6 21.6Z') + P(roundPoly(plusPts(18.6, 6.6, 3.8, 2.6), 0.5)),
  'intent.charge': P(rectD(4.6, 2.4, 14.8, 2.8, 1.4) + rectD(4.6, 18.8, 14.8, 2.8, 1.4) + roundPoly([[6.4, 5], [17.6, 5], [13.4, 12], [17.6, 19], [6.4, 19], [10.6, 12]], 1.2)),

  // set badges
  'set.pair': P(circleD(7.2, 12, 4.8) + circleD(16.8, 12, 4.8)),
  'set.triple': P(circleD(12, 6.6, 4.2) + circleD(6.6, 16.4, 4.2) + circleD(17.4, 16.4, 4.2)),
  'set.rainbow': line('M3.6 12.4A8.4 8.4 0 0 1 20.4 12.4', 3) + P(circleD(5.4, 18.6, 2.6) + circleD(12, 18.6, 2.6) + circleD(18.6, 18.6, 2.6)),

  // interface
  'ui.reroll': cycleArrow() + P(circleD(12, 12, 2.6)),
  'ui.lock': shackleClosed() + lockBody(),
  'ui.unlock': line('M16.2 10.6L16.2 6.4A4.2 4.2 0 0 0 7.8 6.4L7.8 7.2', 3) + lockBody(),
  'ui.undo': line('M8.5 8L14.2 8A5.6 5.6 0 0 1 14.2 19.2L8 19.2', 3) + P(roundPoly([[2.8, 8], [9.6, 2.8], [9.6, 13.2]], 1)),
  'ui.end_turn': P(roundPoly([[3.6, 3.6], [15.4, 12], [3.6, 20.4]], 1.4)) + P(rectD(16.6, 3.6, 3.8, 16.8, 1.4)),
  'ui.settings': cut('ui.settings',
    P(circleD(12, 12, 7.4)) + [0, 45, 90, 135].map((a) => P(rotateD(rectD(9.8, 1.6, 4.4, 20.8, 1.2), a))).join(''),
    P(circleD(12, 12, 3.2))),
  'ui.back': line('M15.2 4.2L7.4 12L15.2 19.8', 3.4),
  'ui.close': line('M5.4 5.4L18.6 18.6M18.6 5.4L5.4 18.6', 3.4),
  'ui.check': line('M3.8 12.6L9.4 18.2L20.2 6.4', 3.4),
  'ui.hp': P(HEART),
  'ui.shield': P(HEATER),
  'ui.ward': path(HEATER + scaleD(HEATER, 0.66, 12, 12), EO) + P(scaleD(HEATER, 0.4, 12, 12)),
  'ui.gold': path(circleD(12, 12, 9.6) + circleD(12, 12, 6.6), EO) + P(circleD(12, 12, 4.4)),
  'ui.downed': path('M4.6 21.4L4.6 10.4A7.4 7.4 0 0 1 19.4 10.4L19.4 21.4Z' + roundPoly([[10.8, 6.6], [13.2, 6.6], [13.2, 9.6], [15.8, 9.6], [15.8, 12], [13.2, 12], [13.2, 17.4], [10.8, 17.4], [10.8, 12], [8.2, 12], [8.2, 9.6], [10.8, 9.6]], 0.4), EO),
  'ui.play': P(rotateD(swordD(), 90)),
  'ui.daily': P(rectD(6.4, 1.8, 2.8, 5.6, 1.2) + rectD(14.8, 1.8, 2.8, 5.6, 1.2)) + path(rectD(3, 4.4, 18, 17.2, 2.8) + rectD(5.6, 10, 12.8, 9, 1.4), EO) + P(circleD(12, 14.5, 2.4)),
  'ui.collection': P(roundPoly([[2, 5], [11, 6.6], [11, 21], [2, 19.4]], 1.2) + roundPoly([[13, 6.6], [22, 5], [22, 19.4], [13, 21]], 1.2)),
  'ui.stats': P(rectD(3.4, 12, 4.8, 9.4, 1.4) + rectD(9.6, 3.2, 4.8, 18.2, 1.4) + rectD(15.8, 8, 4.8, 13.4, 1.4)),
  'ui.feat': P(roundPoly([[5, 1.8], [10, 1.8], [12.4, 8.6], [8.6, 10.4]], 0.8) + roundPoly([[14, 1.8], [19, 1.8], [15.4, 10.4], [11.6, 8.6]], 0.8)) +
    path(circleD(12, 15.2, 7) + roundPoly(starPts(5, 4, 1.7, 12, 15.4), 0.3), EO),
  'ui.feat_locked': P(roundPoly([[5, 1.8], [10, 1.8], [12.4, 8.6], [8.6, 10.4]], 0.8) + roundPoly([[14, 1.8], [19, 1.8], [15.4, 10.4], [11.6, 8.6]], 0.8)) +
    path(circleD(12, 15.2, 7) + circleD(12, 15.2, 4.2), EO),
  'ui.tutorial': cut('ui.tutorial', P(rectD(2.6, 2.6, 18.8, 15, 3.6) + roundPoly([[6, 16], [6, 22], [12.4, 16]], 0.8)), questionCut(12, 8.8, 1)),
  'ui.info': path(circleD(12, 12, 9.8) + circleD(12, 7.4, 1.8) + rectD(10.6, 10.4, 2.8, 7.6, 1.2), EO),
  'ui.unknown': cut('ui.unknown', P(rectD(2.6, 2.6, 18.8, 18.8, 4)), questionCut(12, 10, 1.1)),
  'ui.export': tray() + P(roundPoly(arrowPts(12, 2, 16.2, 6.4, 6.4, 3.2), 0.8)),
  'ui.import': tray() + P(rotateD(roundPoly(arrowPts(12, 2, 16.2, 6.4, 6.4, 3.2), 0.8), 180, 12, 9.1)),
  'ui.reset': P(rectD(3.6, 4.6, 16.8, 2.8, 1.4) + rectD(9.2, 2, 5.6, 3.6, 1.2)) +
    path(roundPoly([[5.4, 9], [18.6, 9], [17.2, 21.6], [6.8, 21.6]], 1.4) + rectD(9, 11.6, 2, 7.6, 1) + rectD(13, 11.6, 2, 7.6, 1), EO),
  'ui.motion': g({ transform: 'rotate(35 12 12)' }, cut('ui.motion', P('M12 1.6C16.4 4.6 17.2 11 12 17.4C6.8 11 7.6 4.6 12 1.6Z'), cutLine('M12.6 7.2L16.6 4.8M12.6 11.4L16.6 9', 1.8)) + line('M12 9L12 22.4', 2.6)),
  'ui.tier': P(FLAME),
  'ui.rotate': path(rectD(3, 6.4, 10.4, 15.6, 2.4) + rectD(5.2, 9, 6, 9.6, 0.8), EO) + line('M14 2.6A7.6 7.6 0 0 1 21 10.4', 2.6) + P(roundPoly([[17.6, 9.4], [24, 9.4], [20.8, 14]], 0.6)),
  'ui.skip': line('M4.6 5L11.6 12L4.6 19', 3.2) + line('M12.4 5L19.4 12L12.4 19', 3.2),
  'ui.act': line('M5.4 21.6L5.4 3', 3) + P(roundPoly([[5.4, 2.8], [20, 8], [5.4, 13.2]], 1.2)),
  'ui.boss': P(roundPoly([[4.6, 8.4], [4.6, 2.4], [8.4, 5.4], [12, 1.6], [15.6, 5.4], [19.4, 2.4], [19.4, 8.4]], 0.8)) +
    path(scaleD(SKULL, 0.74, 12, 21.4) + circleD(9.5, 14.6, 1.9) + circleD(14.5, 14.6, 1.9), EO),
  'ui.fight': P(rotateD(scaleD(swordD(3.2), 0.86), 45)) + P(rotateD(scaleD(swordD(3.2), 0.86), -45)),
  'ui.install': line('M8.6 9.2L6.8 9.2Q5 9.2 5 11L5 19.8Q5 21.6 6.8 21.6L17.2 21.6Q19 21.6 19 19.8L19 11Q19 9.2 17.2 9.2L15.4 9.2', 2.6) +
    P(roundPoly(arrowPts(12, 1.6, 15, 5.4, 5.4, 2.8), 0.7)),
  'ui.target': line('M12 1.8L12 6.6M12 17.4L12 22.2M1.8 12L6.6 12M17.4 12L22.2 12', 2.8) + path(circleD(12, 12, 8) + circleD(12, 12, 5.4), EO) + P(circleD(12, 12, 1.8)),
  'ui.peek': path('M1.6 12C4.4 6.8 8 4.6 12 4.6C16 4.6 19.6 6.8 22.4 12C19.6 17.2 16 19.4 12 19.4C8 19.4 4.4 17.2 1.6 12Z' + circleD(12, 12, 4.8), EO) + P(circleD(12, 12, 2.6)),
};

export function iconSvg(id: string): string {
  const body = ICONS[id];
  if (body === undefined) throw new Error(`No icon: ${id}`);
  return svgDoc(ICON_SIZE, ICON_SIZE, body, { fill: 'currentColor' });
}

/** Inline an icon into a bigger drawing at (x, y), size px, in a colour. */
export function placeIcon(id: string, x: number, y: number, px: number, color: string, extra = ''): string {
  const body = ICONS[id];
  if (body === undefined) throw new Error(`No icon: ${id}`);
  const s = px / ICON_SIZE;
  return `<g transform="translate(${x} ${y}) scale(${Math.round(s * 10000) / 10000})" fill="currentColor" color="${color}"${extra}>${body}</g>`;
}
