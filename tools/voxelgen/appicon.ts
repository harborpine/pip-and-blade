/** App icon (a white die with a crossed-sword pip on deep teal) and the title logo. */
import { Canvas } from './canvas';
import { addBase } from './parts';
import type { Sprite } from './sheet';
import { Model, renderModel } from './voxel';

function dieModel(n: number): Model {
  const m = new Model();
  const lo = -Math.floor(n / 2);
  const hi = lo + n - 1;
  m.box(lo, lo, 0, hi, hi, n - 1, 'w');
  for (const x of [lo, hi]) for (const y of [lo, hi]) for (const z of [0, n - 1]) m.del(x, y, z);
  // pips on the side faces
  const mid = Math.round((lo + hi) / 2);
  m.set(mid, hi, Math.floor((n - 1) / 2), 'r');
  m.set(hi, lo + 1, 1, 'k'); m.set(hi, hi - 1, n - 2, 'k');
  return m;
}

/** One square, fully opaque icon. `n` is the die size in voxels (smaller = more padding, for maskable). */
export function drawAppIcon(size: number, n: number): Canvas {
  const c = new Canvas(size, size);
  // deep teal field with a soft radial lift
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - size / 2) / (size / 2);
      const dy = (y - size / 2) / (size / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      const th = (((bayer[y & 3] as number[])[x & 3] as number) + 0.5) / 16;
      const spec = d < 0.55 ? (th < (0.55 - d) * 1.2 ? 'a+' : 'a') : th < (d - 0.55) * 0.9 ? 'a-' : 'a';
      c.set(x, y, spec);
    }
  }
  const r = renderModel(dieModel(n), { anchorZ: n - 1 });
  const ox = Math.round(size / 2 - r.ax);
  const oy = Math.round((size - r.canvas.h) / 2);
  // soft shadow under the die
  c.ellipse(size / 2, oy + r.canvas.h - 2, r.canvas.w * 0.4, size / 20, 'a-');
  const body = new Canvas(size, size);
  body.blit(r.canvas, ox, oy);
  c.blit(body.outline(), 0, 0);
  // crossed swords on the top face
  const cx = ox + r.ax;
  const cy = oy + r.ay;
  const k = Math.max(0.5, (r.canvas.w - 4) / 36);
  const L = Math.round(11 * k);
  const H = Math.round(5.5 * k);
  const t = size >= 48 ? 3 : 2;
  // dark underlay so both swords stand out from the white top face
  c.line(cx - L, cy - H, cx + L, cy + H, 'k', t + 2);
  c.line(cx - L, cy + H, cx + L, cy - H, 'k', t + 2);
  c.line(cx - L, cy - H, cx + L, cy + H, 'r', t);
  c.line(cx - L, cy + H, cx + L, cy - H, 'n', t);
  c.rect(cx - 1, cy - 1, 3, 3, 'y');
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
  return { canvas: c.outline(), ax: 2 + r.ax, ay: 2 + r.ay };
}
