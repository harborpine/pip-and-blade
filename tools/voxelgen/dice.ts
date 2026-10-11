/** Voxel dice (one per hero) and the die overlays. The top face is left clear for the UI to draw the face icon. */
import { Canvas } from './canvas';
import { HERO_DIE_COLOR } from './heroes';
import { blankIcon } from './icons1';
import type { Sprite } from './sheet';
import { Model, renderModel } from './voxel';


function dieModel(body: string): Model {
  const m = new Model();
  m.box(-3, -3, 0, 3, 3, 6, body);
  // knock off the eight corner voxels for a soft die shape
  for (const sx of [-3, 3]) for (const sy of [-3, 3]) for (const z of [0, 6]) m.del(sx, sy, z);
  // pips on the two visible side faces (+y = left, +x = right)
  m.set(0, 3, 3, 'w');
  m.set(-2, 3, 1, 'w'); m.set(2, 3, 5, 'w');
  m.set(3, -2, 1, 'w'); m.set(3, 2, 1, 'w'); m.set(3, 0, 3, 'w'); m.set(3, -2, 5, 'w'); m.set(3, 2, 5, 'w');
  return m;
}

const sized = (): { w: number; h: number } => {
  const r = renderModel(dieModel('r'), { anchorZ: 6 });
  return { w: r.canvas.w + 4, h: r.canvas.h + 4 };
};

export function buildDice(heroes: string[]): Map<string, Sprite> {
  const out = new Map<string, Sprite>();
  const { w, h } = sized();
  for (const id of heroes) {
    const body = HERO_DIE_COLOR[id] ?? 'w';
    const r = renderModel(dieModel(body), { anchorZ: 6 });
    const c = new Canvas(w, h);
    c.blit(r.canvas, 2, 2);
    out.set(`die.${id}`, { canvas: c.outline(), ax: 2 + r.ax, ay: 2 + r.ay });
  }
  // overlays reuse the silhouette of a die
  const r = renderModel(dieModel('w'), { anchorZ: 6 });
  const base = new Canvas(w, h);
  base.blit(r.canvas, 2, 2);
  const ax = 2 + r.ax;
  const ay = 2 + r.ay;
  const mask = (x: number, y: number): boolean => base.get(x, y) !== 0;
  const edge = (x: number, y: number): boolean => mask(x, y) && (!mask(x - 1, y) || !mask(x + 1, y) || !mask(x, y - 1) || !mask(x, y + 1));
  const overlay = (): Canvas => new Canvas(w, h);
  const clip = (src: Canvas): Canvas => {
    const o = new Canvas(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask(x, y) && src.get(x, y)) o.setRaw(x, y, src.get(x, y));
    return o;
  };

  // locked: gold rim + padlock at the upper right
  {
    const o = overlay();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (edge(x, y)) o.set(x, y, 'y');
    const lx = w - 10;
    const ly = 2;
    o.rect(lx + 1, ly, 1, 3, 'g'); o.rect(lx + 5, ly, 1, 3, 'g'); o.rect(lx + 2, ly, 3, 1, 'g');
    o.rect(lx, ly + 3, 7, 6, 'y');
    o.rect(lx, ly + 3, 7, 1, 'y+');
    o.rect(lx + 3, ly + 5, 1, 2, 'k');
    const done = o.outline();
    out.set('die.locked', { canvas: done, ax, ay });
  }
  // jammed: grey chains crossing the cube
  {
    const o = overlay();
    o.line(2, ay - 8, w - 3, ay + 12, 'g', 2);
    o.line(2, ay + 10, w - 3, ay - 10, 'g', 2);
    for (let t = 0; t < 7; t++) {
      const x = 4 + t * 3.5;
      o.set(x, ay - 8 + t * 3.4, 's');
      o.set(x, ay + 10 - t * 3.4, 's');
    }
    const c = clip(o);
    // thin web strands on the top face
    for (let i = -3; i <= 3; i++) c.set(ax + i * 4, ay - 2 + Math.abs(i), 'g+');
    out.set('die.jammed', { canvas: c.outline(), ax, ay });
  }
  // cursed: purple crack and wisp
  {
    const o = overlay();
    const pts: [number, number][] = [[ax, 6], [ax - 3, 12], [ax + 2, 17], [ax - 2, 23], [ax + 3, 28], [ax, 33]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i] as [number, number];
      const [x1, y1] = pts[i + 1] as [number, number];
      o.line(x0, y0, x1, y1, 'k', 3);
      o.line(x0, y0, x1, y1, 'v', 1);
    }
    const c = clip(o);
    c.rect(ax + 6, 2, 2, 2, 'p'); c.rect(ax + 8, 0, 2, 2, 'v'); c.rect(ax - 7, 3, 2, 2, 'p');
    out.set('die.cursed', { canvas: c.outline(), ax, ay });
  }
  // used: ink checkerboard darkening
  {
    const o = overlay();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask(x, y) && (x + y) % 2 === 0) o.set(x, y, 'k');
    out.set('die.used', { canvas: o, ax, ay });
  }
  // blank: unmistakable empty face, 16 px
  out.set('die.blank', { canvas: blankIcon(), ax: 8, ay: 8 });
  return out;
}
