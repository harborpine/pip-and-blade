/**
 * Round character tokens (docs/flat-style.md section 4): 96x96, a disc of radius 44 with a 6-unit
 * rim, and inside it (within radius 34) a face or emblem of at most about 12 flat shapes.
 *   hero  : ivory disc, rim in the hero colour
 *   enemy : slate disc, slate-3 rim
 *   elite : slate disc, red rim
 *   boss  : slate disc, gold rim (ui shows bosses 1.5x larger)
 */
import { HERO_COLOR, c } from './palette';
import { circle, ellipse, g, path, rect, roundPoly, svgDoc } from './svg';
import { STROKE } from './tokenkit';
import type { TokenDef, TokenKind } from './tokenkit';
import { MORE_TOKENS } from './tokens-more';

export const TOKEN_SIZE = 96;
export type { TokenKind } from './tokenkit';

function frame(kind: TokenKind, heroColor?: string): string {
  const rim = kind === 'hero' ? heroColor! : kind === 'elite' ? c('red') : kind === 'boss' ? c('gold') : c('slate-3');
  const disc = kind === 'hero' ? c('ivory') : c('slate');
  return circle(48, 48, 44, { fill: rim }) + circle(48, 48, 38, { fill: disc });
}

const ink = c('ink');

export const TOKENS: Readonly<Record<string, TokenDef>> = {
  'hero.bulwark': {
    kind: 'hero', color: HERO_COLOR.bulwark,
    face: () =>
      // plume, bucket helm, visor slit, breathing slit
      path('M46 29C42 18 49 11 63 13C57 16 54 21 54 29Z', { fill: c('red') }) +
      path(roundPoly([[29, 27], [67, 27], [67, 70], [29, 70]], [12, 12, 5, 5]), { fill: HERO_COLOR.bulwark }) +
      rect(33, 42, 30, 6, 3, { fill: ink }) +
      rect(45.5, 52, 5, 12, 2.5, { fill: ink }),
  },
  'hero.duelist': {
    kind: 'hero', color: HERO_COLOR.duelist,
    face: () =>
      // feather, hat crown with band, wide brim, eyes, moustache
      path('M55 33C58 24 63 19 71 18C69 26 64 31 58 35Z', { fill: HERO_COLOR.duelist }) +
      path('M34 41C34 30 40 24 48 24C56 24 62 30 62 41Z', { fill: ink }) +
      rect(34, 34, 28, 5, 0, { fill: HERO_COLOR.duelist }) +
      ellipse(48, 42, 29, 6, { fill: ink }) +
      circle(40, 54, 3.6, { fill: ink }) + circle(56, 54, 3.6, { fill: ink }) +
      path('M48 63C44 68 37 69 33 64C38 65 43 63 46 60ZM48 63C52 68 59 69 63 64C58 65 53 63 50 60Z', { fill: ink }) +
      path('M45 63H51L48 72Z', { fill: ink }),
  },
  'hero.herbalist': {
    kind: 'hero', color: HERO_COLOR.herbalist,
    face: () =>
      // hood, face opening, eyes, smile, leaf sprig
      path('M48 22C62 22 70 34 70 50V72H26V50C26 34 34 22 48 22Z', { fill: HERO_COLOR.herbalist }) +
      ellipse(48, 52, 14, 15, { fill: c('ivory-dim') }) +
      circle(43, 50, 2.8, { fill: ink }) + circle(53, 50, 2.8, { fill: ink }) +
      path('M43 58Q48 62 53 58', STROKE(ink, 2.6)) +
      path('M48 22C48 16 52 12 58 12C58 18 54 22 48 22Z', { fill: c('lime') }),
  },
  'enemy.gnaw_rat': {
    kind: 'enemy',
    face: () =>
      // ears, head, eyes, nose, two big teeth
      circle(31, 33, 11, { fill: c('stone') }) + circle(65, 33, 11, { fill: c('stone') }) +
      circle(31, 33, 6, { fill: c('pink') }) + circle(65, 33, 6, { fill: c('pink') }) +
      path('M48 70C40 70 29 56 29 45C29 34 37 28 48 28C59 28 67 34 67 45C67 56 56 70 48 70Z', { fill: c('stone') }) +
      circle(40, 46, 3.4, { fill: ink }) + circle(56, 46, 3.4, { fill: ink }) +
      rect(43, 67, 4.4, 9, 1.2, { fill: c('ivory') }) + rect(48.6, 67, 4.4, 9, 1.2, { fill: c('ivory') }) +
      circle(48, 64, 4.4, { fill: c('pink') }),
  },
  'enemy.mud_slime': {
    kind: 'enemy',
    face: () =>
      // blob body, two drips, eyes with pupils, wobbly mouth
      path('M28 70Q24 70 24 66V50C24 36 34 27 48 27C62 27 72 36 72 50V66Q72 70 68 70Z', { fill: c('brown') }) +
      path('M33 69V74A3 3 0 0 0 39 74V69Z', { fill: c('brown') }) +
      path('M57 69V78A3 3 0 0 0 63 78V69Z', { fill: c('brown') }) +
      circle(39, 47, 7, { fill: c('ivory') }) + circle(57, 47, 7, { fill: c('ivory') }) +
      circle(40, 49, 3.4, { fill: ink }) + circle(56, 49, 3.4, { fill: ink }) +
      path('M38 61Q43 57 48 61Q53 65 58 61', STROKE(ink, 3)),
  },
  'enemy.hollow_stag': {
    kind: 'elite',
    face: () =>
      // antlers, skull, eye sockets with glowing eyes, nostrils
      path('M41 39C37 32 34 26 30 20M35 29L27 29M38 34L38 24', STROKE(c('ivory'), 5)) +
      path('M55 39C59 32 62 26 66 20M61 29L69 29M58 34L58 24', STROKE(c('ivory'), 5)) +
      path('M48 76C42 76 40 70 39 62C37 56 33 50 33 44C33 38 39 35 48 35C57 35 63 38 63 44C63 50 59 56 57 62C56 70 54 76 48 76Z', { fill: c('ivory') }) +
      circle(41, 47, 6, { fill: ink }) + circle(55, 47, 6, { fill: ink }) +
      circle(41, 47, 3, { fill: c('teal') }) + circle(55, 47, 3, { fill: c('teal') }) +
      ellipse(45, 69, 1.8, 2.6, { fill: ink }) + ellipse(51, 69, 1.8, 2.6, { fill: ink }),
  },
  'boss.bramble_king': {
    kind: 'boss',
    face: () =>
      // stump, roots, thorn crown, berries, angry eyes, mouth
      path('M32 40H64V68C64 72 60 74 56 74H40C36 74 32 72 32 68Z', { fill: c('brown') }) +
      path('M32 66L24 76H36ZM64 66L72 76H60Z', { fill: c('brown') }) +
      path(roundPoly([[28, 42], [28, 28], [36, 34], [42, 18], [48, 30], [54, 18], [60, 34], [68, 28], [68, 42]], [1.5, 1, 1, 1, 1, 1, 1, 1, 1.5]), { fill: c('green') }) +
      circle(36, 38, 3.2, { fill: c('red') }) + circle(48, 37, 3.2, { fill: c('red') }) + circle(60, 38, 3.2, { fill: c('red') }) +
      path('M36 50L45 53L36 56Z', { fill: c('gold') }) + path('M60 50L51 53L60 56Z', { fill: c('gold') }) +
      path('M39 66L43 62L48 66L53 62L57 66', STROKE(ink, 3)),
  },
  ...MORE_TOKENS,
};

export function tokenSvg(id: string): string {
  const def = TOKENS[id];
  if (!def) throw new Error(`No token: ${id}`);
  return svgDoc(TOKEN_SIZE, TOKEN_SIZE, frame(def.kind, def.color) + def.face());
}

/** Inline a token into a bigger drawing, px wide, top-left at (x, y). */
export function placeToken(id: string, x: number, y: number, px: number): string {
  const def = TOKENS[id];
  if (!def) throw new Error(`No token: ${id}`);
  return g({ transform: `translate(${x} ${y}) scale(${Math.round((px / TOKEN_SIZE) * 10000) / 10000})` }, frame(def.kind, def.color) + def.face());
}
