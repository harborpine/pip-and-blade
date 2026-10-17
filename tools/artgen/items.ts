/**
 * Items (40) and doors (6): 48x48, flat, at most 3 palette colours each (not currentColor).
 * Shown as <img> on both light (paper) and dark (slate) panels, so every object has a mid-tone
 * main mass or an edge that reads on both.
 */
import { c } from './palette';
import { circle, ellipse, path, rect, roundPoly, svgDoc } from './svg';
import { circleD } from './svg';
import { STROKE } from './tokenkit';
import type { Pt } from './svg';

export const ITEM_SIZE = 48;
const f = (name: string): Record<string, string> => ({ fill: c(name) });
const s = (name: string, w: number): Record<string, string | number> => STROKE(c(name), w);

/** A front-on die: face colour, edge colour, pips (in die-local 0..1 units). */
function die(x: number, y: number, size: number, face: string, edge: string, pips: Pt[], pipColor: string, pipR = 0.1): string {
  const e = Math.max(2.5, size * 0.1);
  return rect(x, y, size, size, size * 0.24, f(edge)) + rect(x + e, y + e, size - 2 * e, size - 2 * e, size * 0.18, f(face)) +
    pips.map(([u, v]) => circle(x + u * size, y + v * size, pipR * size, f(pipColor))).join('');
}
function star4(cx: number, cy: number, ro: number, ri: number): string {
  const pts: Pt[] = [];
  for (let k = 0; k < 8; k++) {
    const a = ((-90 + k * 45) * Math.PI) / 180;
    const r = k % 2 === 0 ? ro : ri;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return roundPoly(pts, 0.6);
}
const HEART = (cx: number, cy: number, k: number): string => {
  const p = (x: number, y: number): string => `${(cx + (x - 12) * k).toFixed(2)} ${(cy + (y - 12) * k).toFixed(2)}`;
  return `M${p(12, 21)}C${p(7, 17.4)} ${p(2.4, 13.8)} ${p(2.4, 8.9)}C${p(2.4, 5.9)} ${p(4.7, 3.6)} ${p(7.5, 3.6)}C${p(9.4, 3.6)} ${p(11.1, 4.7)} ${p(12, 6.4)}C${p(12.9, 4.7)} ${p(14.6, 3.6)} ${p(16.5, 3.6)}C${p(19.3, 3.6)} ${p(21.6, 5.9)} ${p(21.6, 8.9)}C${p(21.6, 13.8)} ${p(17, 17.4)} ${p(12, 21)}Z`;
};

export const ITEMS: Readonly<Record<string, () => string>> = {
  'item.whetstone': () =>
    path(roundPoly([[6, 30], [30, 12], [42, 20], [18, 38]], 4), f('stone')) +
    path('M12 30L32 15.4', s('ink-soft', 3)) +
    path(star4(36, 34, 8, 2.6), f('gold')),
  'item.oak_buckler': () =>
    circle(24, 24, 19, f('brown')) + circle(24, 24, 13, s('ink-soft', 2.6)) + circle(24, 24, 6.5, f('stone')),
  'item.healers_satchel': () =>
    path('M15 18Q15 8 24 8Q33 8 33 18', s('brown', 3.4)) +
    rect(7, 16, 34, 26, 7, f('brown')) +
    path(roundPoly([[21, 22], [27, 22], [27, 26], [31, 26], [31, 32], [27, 32], [27, 36], [21, 36], [21, 32], [17, 32], [17, 26], [21, 26]], 1), f('green')),
  'item.lucky_coin': () =>
    circle(24, 24, 19, f('gold')) + circle(24, 24, 15, s('gold-ink', 2.4)) +
    circle(20.5, 20.5, 4, f('green')) + circle(27.5, 20.5, 4, f('green')) + circle(20.5, 27.5, 4, f('green')) + circle(27.5, 27.5, 4, f('green')),
  'item.hollow_die': () =>
    die(7, 7, 34, 'stone', 'ink-soft', [], 'ink') + path('M30 9L24 19L30 25L23 34', s('ink-soft', 3)),
  'item.loaded_pip': () =>
    die(7, 7, 34, 'ivory', 'slate-3', [[0.27, 0.27], [0.73, 0.73]], 'slate-3', 0.08) + circle(24, 24, 7, f('red')),
  'item.first_pick_glove': () =>
    path('M10 44L10 26C10 20 13 17 17 17L17 10Q17 7 20 7Q23 7 23 10L23 20L27 22L32 15Q34 12 37 14Q39 16 37 19L31 30L31 44Z', f('brown')) +
    die(29, 4, 15, 'ivory', 'slate-3', [[0.5, 0.5]], 'slate-3', 0.13),
  'item.thorn_mail': () =>
    path(roundPoly([[4, 16], [10, 12], [16, 6], [20, 12], [12, 20]], 0.6) + roundPoly([[44, 16], [38, 12], [32, 6], [28, 12], [36, 20]], 0.6) +
      roundPoly([[3, 34], [9, 30], [10, 38]], 0.6) + roundPoly([[45, 34], [39, 30], [38, 38]], 0.6), f('stone')) +
    path('M12 10L18 8Q24 12 30 8L36 10L40 18L36 22L36 42Q24 46 12 42L12 22L8 18Z', f('green')) +
    path('M24 14L24 40', s('ink-soft', 2.4)),
  'item.venom_vial': () =>
    rect(20, 4, 8, 6, 2, f('brown')) +
    path('M20 9L28 9L28 17C35 19 40 25 40 31C40 39 33 44 24 44C15 44 8 39 8 31C8 25 13 19 20 17Z', f('slate-3')) +
    path('M11 29L37 29C37.8 30 38 31 38 32C38 38 32 42 24 42C16 42 10 38 10 32C10 31 10.2 30 11 29Z', f('lime')) +
    circle(19, 35, 2.4, f('slate-3')) + circle(28, 37, 1.8, f('slate-3')),
  'item.twin_charm': () =>
    circle(18, 24, 11, s('gold', 5.4)) + circle(30, 24, 11, s('gold', 5.4)) + path('M24.6 15.2A11 11 0 0 1 29.6 13', s('gold', 5.4)),
  'item.crown_of_three': () =>
    path(roundPoly([[6, 36], [6, 14], [15, 22], [24, 9], [33, 22], [42, 14], [42, 36]], 1.6), f('gold')) +
    rect(6, 34, 36, 7, 2, f('gold')) +
    circle(15, 30, 3.4, f('red')) + circle(24, 28, 3.8, f('blue')) + circle(33, 30, 3.4, f('red')),
  'item.patient_hourglass': () =>
    rect(9, 4, 30, 6, 3, f('brown')) + rect(9, 38, 30, 6, 3, f('brown')) + path('M12 10L12 38M36 10L36 38', s('brown', 3)) +
    path(roundPoly([[16, 12], [32, 12], [24, 22]], 1.5) + roundPoly([[24, 28], [32, 36], [16, 36]], 1.5), f('blue')),
  'item.gamblers_ante': () =>
    ellipse(24, 36, 17, 7, f('blue')) + rect(7, 30, 34, 6, 0, f('blue')) +
    ellipse(24, 30, 17, 7, f('purple')) + rect(7, 24, 34, 6, 0, f('purple')) +
    ellipse(24, 24, 17, 7, f('red')) + rect(7, 18, 34, 6, 0, f('red')) + ellipse(24, 18, 17, 7, f('red')) +
    ellipse(24, 18, 9, 3.4, s('purple', 2.4)),
  'item.iron_ration': () =>
    path('M31 4L31 14M28 4L28 10M34 4L34 10', s('ink-soft', 2.4)) + path('M31 14L31 22', s('ink-soft', 3)) +
    rect(7, 20, 34, 24, 5, f('stone')) + ellipse(24, 20, 17, 5, f('stone')) +
    rect(7, 27, 34, 9, 0, f('red')),
  'item.seedling_pot': () =>
    path('M24 24L24 14', s('green', 3)) +
    path('M23 18C16 18 11 14 11 8C18 8 23 12 23 18Z', f('green')) + path('M25 16C25 9 29 5 37 5C37 12 33 16 25 16Z', f('green')) +
    path(roundPoly([[8, 22], [40, 22], [40, 29], [36, 29], [33, 44], [15, 44], [12, 29], [8, 29]], 2), f('ember')),
  'item.red_bandana': () =>
    path(roundPoly([[38, 20], [46, 36], [40, 38], [35, 23]], 1.4) + roundPoly([[36, 22], [33, 41], [27, 39], [33, 21]], 1.4), f('red')) +
    path(roundPoly([[3, 17], [38, 12], [40, 23], [5, 28]], 3), f('red')) +
    path('M7 22L36 17.6', s('pink', 2.4)) +
    circle(38, 19, 5, f('red')),
  'item.mirror_shard': () =>
    path(roundPoly([[14, 6], [36, 10], [41, 24], [30, 43], [12, 38], [8, 22]], 1.5), f('blue')) +
    path('M17 16L24 12M15 24L28 15', s('paper', 3)),
  'item.ward_stone': () =>
    path('M10 30C6 18 14 8 26 8C38 8 43 18 40 30C37 40 30 43 23 43C16 43 12 38 10 30Z', f('blue')) +
    path('M25 14L25 37M25 23L18 15M25 23L32 15', s('paper', 3.2)),
  'item.bone_charm': () =>
    path('M8 6Q24 22 40 6', s('brown', 2.6)) +
    path(`M24 13C33 13 38 19 38 26C38 30 36 33 33 35L33 40Q33 43 30 43L18 43Q15 43 15 40L15 35C12 33 10 30 10 26C10 19 15 13 24 13Z${circleD(18.6, 26, 3.6)}${circleD(29.4, 26, 3.6)}`, { ...f('ivory-dim'), 'fill-rule': 'evenodd' }) +
    path('M20 38L20 42M24 38L24 42M28 38L28 42', s('ink-soft', 2)),
  'item.unjam_oil': () =>
    path('M28 18L42 8', s('gold-ink', 3.4)) +
    path(roundPoly([[8, 22], [32, 22], [34, 42], [6, 42]], 3), f('gold')) + ellipse(20, 22, 12, 4, f('gold')) +
    path('M43 16C43 16 46 20 46 22A3 3 0 0 1 40 22C40 20 43 16 43 16Z', f('brown')),
  'item.purse_string': () =>
    circle(30, 12, 6, f('gold')) +
    path('M18 16L30 16L28 20C38 24 42 30 42 35C42 41 35 44 24 44C13 44 6 41 6 35C6 30 10 24 20 20Z', f('brown')) +
    path('M16 19L32 19', s('gold-ink', 3)),
  'item.spiked_pommel': () =>
    path(roundPoly([[14, 4], [34, 4], [24, 12]], 1.4), f('stone')) +
    rect(10, 12, 28, 6, 3, f('stone')) + rect(20, 18, 8, 16, 2, f('brown')) + circle(24, 37, 5, f('stone')) +
    path(roundPoly([[21, 40], [27, 40], [24, 47]], 0.5), f('stone')),
  'item.leech_fang': () =>
    path('M12 6C26 6 38 12 40 26C41 34 38 40 32 44C34 34 30 24 18 20Q12 18 12 12Z', f('red')) +
    path('M14 9C20 9 24 10 27 12', s('pink', 2.6)),
  'item.battle_drum': () =>
    path('M10 4L24 18M38 4L24 18', s('brown', 3.4)) +
    path('M6 22L42 22L40 40Q24 46 8 40Z', f('red')) +
    ellipse(24, 22, 18, 6, f('ivory-dim')) +
    path('M8 28L24 40L40 28', s('ivory-dim', 2.4)),
  'item.last_word': () =>
    rect(8, 8, 32, 30, 3, f('ivory-dim')) + rect(5, 5, 38, 6, 3, f('brown')) + rect(5, 35, 38, 6, 3, f('brown')) +
    path('M14 17L32 17M14 23L28 23', s('brown', 2.4)) +
    circle(31, 32, 6.5, f('red')),
  'item.cleaver_hook': () =>
    path(roundPoly([[34, 30], [40, 30], [44, 44], [38, 44]], 1.6), f('brown')) +
    path('M6 10L36 10L36 32L14 32C8 32 4 28 4 22L4 18C4 14 6 12 9 12C9 16 10 18 13 18L13 14Z', f('stone')) +
    circle(30, 16, 2.6, f('ink-soft')),
  'item.field_medic_kit': () =>
    path('M17 13L17 9Q17 6 20 6L28 6Q31 6 31 9L31 13', s('slate-3', 3.4)) +
    rect(5, 12, 38, 30, 6, f('slate-3')) + rect(8, 15, 32, 24, 4, f('ivory')) +
    path(HEART(24, 27, 0.78), f('red')),
  'item.merchants_scale': () =>
    rect(22.5, 9, 3, 30, 1.4, f('gold')) + rect(13, 39, 22, 5, 2.5, f('gold')) + rect(5, 9, 38, 4, 2, f('gold')) +
    path('M9 13L4 26M9 13L14 26M39 13L34 26M39 13L44 26', s('gold-ink', 2)) +
    path('M3 26L15 26A6 6 0 0 1 3 26Z', f('gold')) + path('M33 26L45 26A6 6 0 0 1 33 26Z', f('gold')) +
    circle(24, 7, 3, f('gold')),
  'item.void_pip': () =>
    rect(5, 5, 38, 38, 10, s('purple', 3)) + die(9, 9, 30, 'ink-soft', 'ink', [], 'ink'),
  'item.echo_bell': () =>
    path('M8 16A16 16 0 0 1 8 32M40 16A16 16 0 0 0 40 32', s('blue', 3)) +
    rect(21, 4, 6, 10, 3, f('brown')) +
    path('M14 34C14 20 17 13 24 13C31 13 34 20 34 34L37 37L11 37Z', f('stone')) +
    circle(24, 40, 3.4, f('stone')),
  'item.reckless_idol': () =>
    path(roundPoly([[13, 18], [8, 4], [19, 13]], 1.2) + roundPoly([[35, 18], [40, 4], [29, 13]], 1.2), f('red')) +
    path(roundPoly([[13, 14], [35, 14], [37, 44], [11, 44]], 4), f('red')) +
    rect(16, 22, 6, 4, 2, f('ink')) + rect(26, 22, 6, 4, 2, f('ink')) + rect(18, 32, 12, 4, 2, f('ink')),
  'item.executioners_hood': () =>
    path('M24 3C34 10 42 22 42 44L6 44C6 22 14 10 24 3Z', f('ink-soft')) +
    ellipse(18, 25, 3.6, 2.6, f('red')) + ellipse(30, 25, 3.6, 2.6, f('red')),
  'item.rainbow_prism': () =>
    path('M2 30L18 26', s('ivory-dim', 3)) +
    path('M30 24L46 16M30 27L46 27', s('red', 3)) + path('M30 30L46 38', s('blue', 3)) +
    path(roundPoly([[24, 7], [38, 38], [10, 38]], 2), f('ivory-dim')),
  'item.pip_magnet': () =>
    path('M10 8L10 24A14 14 0 0 0 38 24L38 8', s('red', 9)) +
    rect(5.5, 4, 9, 7, 1.5, f('stone')) + rect(33.5, 4, 9, 7, 1.5, f('stone')) +
    circle(24, 44, 3.4, f('ink')) + circle(24, 44, 3.4, s('stone', 1.6)),
  'item.glass_cannon': () =>
    path(roundPoly([[4, 20], [34, 12], [38, 24], [8, 32]], 3), { fill: c('blue'), 'fill-opacity': 0.75 }) +
    path('M9 22L30 16.4', s('paper', 2.4)) +
    circle(22, 34, 8, f('brown')) + circle(22, 34, 3, f('paper')),
  'item.tortoise_shell': () =>
    path('M4 36C4 20 12 10 24 10C36 10 44 20 44 36Z', f('green')) +
    rect(3, 34, 42, 6, 3, f('brown')) +
    path(roundPoly([[18, 20], [30, 20], [33, 27], [24, 33], [15, 27]], 1.2), f('lime')),
  'item.plague_censer': () =>
    path('M24 2L24 14', s('stone', 2.4)) +
    path('M12 22C12 34 17 40 24 40C31 40 36 34 36 22Z', f('stone')) + rect(10, 18, 28, 6, 3, f('stone')) +
    circle(16, 12, 4.4, f('lime')) + circle(34, 10, 5, f('lime')) + circle(40, 18, 3.4, f('lime')) + circle(8, 18, 3, f('lime')),
  'item.double_or_nothing': () =>
    die(3, 14, 24, 'ivory', 'ink-soft', [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]], 'ink', 0.1) +
    die(22, 6, 24, 'ink-soft', 'ink', [[0.3, 0.3], [0.7, 0.7]], 'ivory', 0.1),
  'item.phoenix_feather': () =>
    path('M10 44L22 26', s('ember', 3)) +
    path('M18 30C14 22 18 10 30 4C36 12 34 26 24 32Z', f('ember')) +
    path('M30 4C33 1 37 2 39 6C38 9 35 10 33 9C34 7 33 5 30 4Z', f('red')) +
    path('M24 32C30 24 34 14 34 8', s('red', 2.4)),
  'item.kings_die': () =>
    die(6, 6, 36, 'gold', 'gold-ink', [], 'ink') +
    path(roundPoly([[14, 30], [14, 17], [19, 22], [24, 14], [29, 22], [34, 17], [34, 30]], 1.2), f('gold-ink')),
};

/** Doors: an arched door in the middle, an emblem on it. */
const doorShape = (fill: string): string => path('M10 45L10 20C10 11 16 5 24 5C32 5 38 11 38 20L38 45Z', f(fill));
export const DOORS: Readonly<Record<string, () => string>> = {
  'door.elite': () =>
    doorShape('ink-soft') + path('M10 22L38 22M10 34L38 34', s('slate-3', 2.6)) +
    path(`M24 21C29 21 31.5 24 31.5 27.6C31.5 29.6 30.6 31 29 32L29 34.4Q29 35.6 27.8 35.6L20.2 35.6Q19 35.6 19 34.4L19 32C17.4 31 16.5 29.6 16.5 27.6C16.5 24 19 21 24 21Z${circleD(21, 27.6, 2)}${circleD(27, 27.6, 2)}`, { ...f('red'), 'fill-rule': 'evenodd' }),
  'door.rest': () =>
    doorShape('brown') + path('M24 10L24 45', s('gold-ink', 2)) +
    path('M24 18C27 22 31 25 31 30A7 7 0 0 1 17 30C17 27 19 25 20.5 23.5C21 26 22 27 23 27.5C23 24 23.4 21 24 18Z', f('ember')) +
    path('M15 39L33 35M15 35L33 39', s('gold-ink', 2.6)),
  'door.shop': () =>
    doorShape('brown') +
    path('M4 18L44 18L42 26L6 26Z', f('red')) + path('M14 18L13 26M24 18L24 26M34 18L35 26', s('ivory', 3.4)) +
    circle(24, 35, 6, f('ivory')) + circle(24, 35, 3, s('red', 2)),
  'door.event': () =>
    doorShape('purple') +
    path('M19.5 19.5A5 5 0 1 1 25.4 24.4Q24 25.4 24 28', s('paper', 3.4)) + circle(24, 34, 2.4, f('paper')),
  'door.treasure': () =>
    doorShape('gold') +
    rect(15, 23, 18, 14, 3, f('brown')) + path('M15 28L33 28', s('gold', 2.4)) + rect(22, 26, 4, 5, 1.2, f('gold')),
  'door.onward': () =>
    path('M7 46L7 20C7 10 14 3 24 3C34 3 41 10 41 20L41 46L34 46L34 21C34 14 30 10 24 10C18 10 14 14 14 21L14 46Z', f('slate-3')) +
    path(roundPoly([[17, 24], [24, 24], [24, 18], [33, 28], [24, 38], [24, 32], [17, 32]], 1.2), f('gold')),
};

export function itemSvg(id: string): string {
  const fn = ITEMS[id] ?? DOORS[id];
  if (!fn) throw new Error(`No item or door: ${id}`);
  return svgDoc(ITEM_SIZE, ITEM_SIZE, fn());
}
