/** App icon (a white toy die and sword on deep teal) and the title logo. */
import { Canvas } from './canvas';
import { addBase } from './parts';
import type { Sprite } from './sheet';
import { Model, renderModel } from './voxel';

/**
 * One square, fully opaque icon: a white toy die with a toy sword leaning on it (both drawn by
 * the isometric renderer) on a flat deep-teal field. `n` is the die size in voxels
 * (smaller = more padding, for the maskable icon).
 */
export function drawAppIcon(size: number, n: number): Canvas {
  const c = new Canvas(size, size);
  c.rect(0, 0, size, size, 'a');
  const e = n - 1;
  const m = new Model();
  m.box(0, 0, 0, e, e, e, 'w');
  for (const x of [0, e]) for (const y of [0, e]) for (const z of [0, e]) m.del(x, y, z);
  const mid = Math.floor(e / 2);
  m.box(mid, mid, e, mid + (n > 6 ? 1 : 0), mid + (n > 6 ? 1 : 0), e, 'r'); // one red pip on top
  for (const [y, z] of [[1, e - 1], [e - 1, 1], [mid, mid]] as [number, number][]) m.set(e, y, z, 'k');
  // the sword, leaning across the near-left face
  const s = new Model();
  const len = n;
  for (let i = 0; i < len; i++) {
    const col = i === 0 ? 'u' : i === 1 ? 'y' : 'g';
    s.box(i, e + 1, i, i + 1, e + 1, i, col);
    if (i > 1) s.set(i, e + 1, i, 'w');
  }
  s.box(0, e + 1, 2, 0, e + 1, 2, 'y'); s.box(3, e + 1, 0, 3, e + 1, 0, 'y');
  const r = renderModel(m, { anchorZ: 0, front: s });
  const body = new Canvas(size, size);
  const ox = Math.round((size - r.canvas.w) / 2);
  const oy = Math.round((size - r.canvas.h) / 2);
  // a flat darker diamond under the die: its shadow on the table
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (Math.abs(x - size / 2) / 2 + Math.abs(y - (oy + r.canvas.h - n)) <= n + 3) c.set(x, y, 'a-');
  }
  body.blit(r.canvas, ox, oy);
  c.blit(body.outline(), 0, 0);
  return c;
}

/** Title art: a die and a short sword crossed, on a miniature base. */
export function buildLogo(): Sprite {
  const m = new Model();
  addBase(m, 'boss', 9);
  const lo = -4;
  const hi = 4;
  m.box(lo, lo, 2, hi, hi, 10, 'r');
  for (const x of [lo, hi]) for (const y of [lo, hi]) for (const z of [2, 10]) m.del(x, y, z);
  m.box(-1, hi, 5, 1, hi, 7, 'w');
  for (const [y, z] of [[-3, 4], [3, 4], [-3, 8], [3, 8], [0, 6]] as [number, number][]) m.box(hi, y - 1, z - 1, hi, y, z, 'w');
  // short sword leaning in front of the die (drawn on top): tip above the die's top corner
  const s = new Model();
  const Y = 7;
  for (let i = -1; i <= 11; i++) {
    const x = 4 - Math.round(i * 0.8);
    const z = 3 + i;
    if (i < 0) { s.set(x, Y, z, 'y'); s.set(x + 1, Y, z, 'y'); continue; }
    if (i <= 2) { s.set(x, Y, z, 'u'); s.set(x + 1, Y, z, 'u'); continue; }
    if (i === 3) {
      for (let d = -3; d <= 4; d++) s.set(x + d, Y, z + Math.round(d * 0.5), 'y');
      continue;
    }
    s.set(x - 1, Y, z, 'w'); s.set(x, Y, z, 'g'); s.set(x + 1, Y, z, 'g');
    if (i === 11) s.set(x - 1, Y, z + 1, 'w');
  }
  const r = renderModel(m, { anchorZ: 1, front: s });
  const c = new Canvas(r.canvas.w + 4, r.canvas.h + 4);
  c.blit(r.canvas, 2, 2);
  return { canvas: c.outline(), ax: 2 + r.ax, ay: 2 + r.ay, render: 'voxel' };
}
