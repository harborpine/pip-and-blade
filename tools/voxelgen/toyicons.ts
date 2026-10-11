/**
 * Toy icons: every icon is a tiny voxel model drawn by the same isometric renderer as the
 * characters (three shades, ink outline, shared palette, no base).
 *
 * Most are "standees": a bitmap stood up as a wall of voxels in the x-z plane, two voxels
 * thick, so the bright front faces the viewer's left like the shields the heroes carry.
 * In a bitmap each letter is a palette key, '.' is empty; a cell is one voxel.
 *
 * Drawing rules (they are what makes an icon read at 24 px):
 *  - clean edges in a standee are: vertical, along x (slopes gently down to the right) and the
 *    "/" diagonal (exactly 45 degrees on screen). The other diagonal, or a curve on the
 *    right-hand side, turns into a saw edge: avoid it.
 *  - symmetric symbols (heart, plus, shield, skull) are "lifted": each group of columns further
 *    right is raised one voxel, which cancels the isometric lean so the symbol stands upright.
 *  - one bold object, at most one accent colour.
 */
import { Canvas } from './canvas';
import type { Sprite } from './sheet';
import { Model, renderModel } from './voxel';

/** Native size of a standard icon. 36 px shows at 24 CSS px as exactly 2 device px per pixel on a 3x phone. */
export const ICON = 36;

/** Stand a bitmap up in the x-z plane, filling y0..y1. Row 0 is the top. `lift[c]` raises column c by that many voxels. */
export function wall(m: Model, rows: string[], y0: number, y1: number, lift: number[] = [], x0 = 0, z0 = 0): Model {
  const H = rows.length;
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '.' || ch === ' ') return;
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) m.set(x0 + c, y, z0 + H - 1 - r + (lift[c] ?? 0), ch);
    });
  });
  return m;
}

/** Render a model through the isometric renderer, centre it on a square canvas and outline it in ink. */
export function toy(m: Model, size = ICON): Sprite {
  const r = renderModel(m);
  if (r.canvas.w > size - 2 || r.canvas.h > size - 2) throw new Error(`toy icon ${r.canvas.w}x${r.canvas.h} does not fit ${size}`);
  const c = new Canvas(size, size);
  c.blit(r.canvas, Math.floor((size - r.canvas.w) / 2), Math.floor((size - r.canvas.h) / 2));
  return { canvas: c.outline(), ax: size / 2, ay: size / 2, render: 'voxel' };
}

export const sub = (rows: string[], map: Record<string, string>): string[] =>
  rows.map((r) => [...r].map((ch) => map[ch] ?? ch).join(''));

// ------------------------------------------------------------------ reusable toy parts

/** Sword on the clean diagonal. Point to the upper right, or (down) hilt at the upper right and point to the lower left. */
export function sword(blade: string, edge: string, guard: string, grip: string, down = false): Model {
  const up = [
    '......EE',
    '.....EBB',
    '....EBB.',
    '...EBB..',
    'G.EBB...',
    '.GBB....',
    '.HGG....',
    'H..G....',
  ];
  const dn = [
    '....G..H',
    '....GGH.',
    '....BBG.',
    '...BBE.G',
    '..BBE...',
    '.BBE....',
    'BBE.....',
    'EE......',
  ];
  return wall(new Model(), sub(down ? dn : up, { E: edge, B: blade, G: guard, H: grip }), 0, 1);
}

export const LIFT8 = [0, 0, 0, 0, 1, 1, 1, 1];

/** Shield standing upright: rim colour, field colour, optional cross emblem colour. */
export function shield(field: string, rim: string, emblem?: string): Model {
  const rows = sub([
    'RRRRRRRR',
    'RFFEEFFR',
    'RFFEEFFR',
    'REEEEEER',
    'RFFEEFFR',
    '.RFEEFR.',
    '..REER..',
    '...RR...',
  ], { R: rim, F: field, E: emblem ?? field });
  return wall(new Model(), rows, 0, 1, LIFT8);
}

export function heart(col: string, shine: string): Model {
  const rows = sub([
    '.CCC...CCC.',
    'CSCCC.CCCCC',
    'CCCCCCCCCCC',
    'CCCCCCCCCCC',
    '.CCCCCCCCC.',
    '..CCCCCCC..',
    '...CCCCC...',
    '.....C.....',
  ], { C: col, S: shine });
  return wall(new Model(), rows, 0, 1, [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2]);
}

export function skull(col: string, eye: string): Model {
  const rows = sub([
    '.CCCCCC.',
    'CCCCCCCC',
    'CEECCEEC',
    'CEECCEEC',
    'CCCCCCCC',
    '.CCCCCC.',
    '.CECCEC.',
  ], { C: col, E: eye });
  return wall(new Model(), rows, 0, 2, LIFT8);
}

/** Padlock at an origin: 7 wide (x), 3 deep (y), 7 tall. Open = shackle swung out to the right. */
export function padlock(m: Model, open: boolean, x0 = 0, y0 = 0, z0 = 0, body = 'y', shackle = 'g'): Model {
  m.box(x0, y0, z0, x0 + 6, y0 + 2, z0 + 3, body);
  m.box(x0 + 3, y0 + 2, z0 + 1, x0 + 3, y0 + 2, z0 + 2, 'k');
  m.set(x0 + 2, y0 + 2, z0 + 2, 'k'); m.set(x0 + 4, y0 + 2, z0 + 2, 'k');
  const y = y0 + 1;
  if (!open) {
    m.box(x0 + 1, y, z0 + 4, x0 + 1, y, z0 + 5, shackle);
    m.box(x0 + 5, y, z0 + 4, x0 + 5, y, z0 + 5, shackle);
    m.box(x0 + 1, y, z0 + 6, x0 + 5, y, z0 + 6, shackle);
  } else {
    m.box(x0 + 5, y, z0 + 4, x0 + 5, y, z0 + 5, shackle);
    m.box(x0 + 5, y, z0 + 6, x0 + 9, y, z0 + 6, shackle);
    m.box(x0 + 9, y, z0 + 4, x0 + 9, y, z0 + 5, shackle);
  }
  return m;
}

/** A little white die with ink pips, its far bottom corner at the origin. */
export function miniDie(m: Model, n = 5, h = 4, col = 'w', pip = 'k'): Model {
  const e = n - 1;
  m.box(0, 0, 0, e, e, h - 1, col);
  const c = Math.floor(e / 2);
  m.set(c, c, h - 1, pip);
  m.set(1, e, 1, pip); m.set(e - 1, e, h - 2, pip);
  m.set(e, 1, h - 2, pip); m.set(e, e - 1, 1, pip);
  return m;
}

/** Lift pattern: lifts(4, 4) = [0,0,0,0,1,1,1,1]. Each group of columns stands one voxel higher than the last. */
export function lifts(...groups: number[]): number[] {
  const out: number[] = [];
  groups.forEach((n, g) => { for (let i = 0; i < n; i++) out.push(g); });
  return out;
}

/**
 * Stand a bitmap up in the y-z plane (facing the viewer's right, so its front is the dark shade),
 * filling x0..x1. Read left to right on screen. On this wall the OTHER diagonal is the clean one,
 * so a model can mix both walls to make an X or a V.
 */
export function wallY(m: Model, rows: string[], x0: number, x1: number, y0 = 0, z0 = 0): Model {
  const H = rows.length;
  const W = Math.max(...rows.map((r) => r.length));
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '.' || ch === ' ') return;
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) m.set(x, y0 + W - 1 - c, z0 + H - 1 - r, ch);
    });
  });
  return m;
}

/** A plain little block. */
export function cube(m: Model, x: number, y: number, z: number, n: number, col: string, h = n): Model {
  return m.box(x, y, z, x + n - 1, y + n - 1, z + h - 1, col);
}

/** Arrow on the clean diagonal, pointing up and right (or, flipped, down and left). 7x7. */
export function arrowNE(col: string, flip = false): Model {
  const rows = [
    '..CCCCC',
    '...CCCC',
    '..CCCCC',
    '.CCC.CC',
    'CCC...C',
    'CC.....',
    'C......',
  ];
  const r = sub(flip ? rows.map((x) => [...x].reverse().join('')).reverse() : rows, { C: col });
  return wall(new Model(), r, 0, 1);
}

/** Two steel chain links. */
export function chainLinks(): Model {
  const m = new Model();
  wall(m, ['.ggg.', 'g...g', 'g...g', 'g...g', '.ggg.'], 2, 2, [], 0, 3);
  wall(m, ['.sss.', 's...s', 's...s', 's...s', '.sss.'], 0, 0, [], 3, 0);
  m.box(3, 1, 3, 3, 1, 4, 's');
  return m;
}

/** Small padlock: 4 wide, 2 deep, 5 tall. */
export function miniLock(m: Model, x0 = 0, y0 = 0, z0 = 0): Model {
  m.box(x0, y0, z0, x0 + 3, y0 + 1, z0 + 2, 'y');
  m.set(x0 + 1, y0 + 1, z0 + 1, 'k'); m.set(x0 + 2, y0 + 1, z0 + 1, 'k');
  m.box(x0, y0, z0 + 3, x0, y0, z0 + 3, 'g'); m.box(x0 + 3, y0, z0 + 3, x0 + 3, y0, z0 + 3, 'g');
  m.box(x0, y0, z0 + 4, x0 + 3, y0, z0 + 4, 'g');
  return m;
}

/** Two toys in one icon: each is rendered and outlined on its own, then the second is stood in front of the first. */
export function pair(back: Model, bx: number, by: number, front: Model, fx: number, fy: number, size = ICON): Sprite {
  const c = new Canvas(size, size);
  const put = (m: Model, x: number, y: number): void => {
    const r = renderModel(m).canvas;
    const o = new Canvas(r.w + 2, r.h + 2);
    o.blit(r, 1, 1);
    if (x < 0 || y < 0 || x + o.w > size || y + o.h > size) throw new Error(`pair part ${o.w}x${o.h} at ${x},${y} does not fit ${size}`);
    c.blit(o.outline(), x, y);
  };
  put(back, bx, by);
  put(front, fx, fy);
  return { canvas: c, ax: size / 2, ay: size / 2, render: 'voxel' };
}
