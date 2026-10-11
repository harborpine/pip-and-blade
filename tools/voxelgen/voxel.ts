/**
 * Voxel models and the single fixed isometric renderer.
 *
 * Coordinates: x = forward (the way a character faces), y = sideways, z = up. The camera looks
 * from the (+x, +y, +z) corner, so the visible faces are: top (light), +y face = screen-left (medium),
 * +x face = screen-right (dark). Characters face +x, i.e. towards the lower right. Enemies are
 * rendered mirrored (x and y swapped) so they face the lower left, towards the heroes.
 */
import { Canvas } from './canvas';
import { shadeDark, shadeMid, shadeTop } from './palette';

const OFF = 64;
const keyOf = (x: number, y: number, z: number): number => (x + OFF) | ((y + OFF) << 8) | ((z + OFF) << 16);

export class Model {
  readonly vox = new Map<number, string>();

  set(x: number, y: number, z: number, c: string): this {
    this.vox.set(keyOf(Math.round(x), Math.round(y), Math.round(z)), c);
    return this;
  }
  has(x: number, y: number, z: number): boolean {
    return this.vox.has(keyOf(x, y, z));
  }
  del(x: number, y: number, z: number): this {
    this.vox.delete(keyOf(x, y, z));
    return this;
  }
  /** Inclusive box. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: string): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) this.set(x, y, z, c);
      }
    }
    return this;
  }
  /** Inclusive box mirrored across y=0 (give y0..y1 on the positive side or any side). */
  boxM(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: string): this {
    this.box(x0, y0, z0, x1, y1, z1, c);
    this.box(x0, -y0, z0, x1, -y1, z1, c);
    return this;
  }
  /** Remove an inclusive box. */
  cut(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) this.del(x, y, z);
      }
    }
    return this;
  }
  /** Filled ellipsoid (voxels whose centre is inside). */
  ellip(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, c: string): this {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
          const dx = (x - cx) / (rx + 0.3);
          const dy = (y - cy) / (ry + 0.3);
          const dz = (z - cz) / (rz + 0.3);
          if (dx * dx + dy * dy + dz * dz <= 1) this.set(x, y, z, c);
        }
      }
    }
    return this;
  }
  /** Vertical cylinder from z0..z1 inclusive. */
  cyl(cx: number, cy: number, z0: number, z1: number, r: number, c: string): this {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r + 0.3) for (let z = z0; z <= z1; z++) this.set(x, y, z, c);
      }
    }
    return this;
  }
  /** Straight line of voxels. */
  line(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: string): this {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1);
    for (let s = 0; s <= n; s++) {
      this.set(x0 + ((x1 - x0) * s) / n, y0 + ((y1 - y0) * s) / n, z0 + ((z1 - z0) * s) / n, c);
    }
    return this;
  }
  /** Copy all voxels of another model, shifted. */
  add(other: Model, dx = 0, dy = 0, dz = 0): this {
    for (const [k, c] of other.vox) {
      const x = (k & 255) - OFF;
      const y = ((k >> 8) & 255) - OFF;
      const z = ((k >> 16) & 255) - OFF;
      this.set(x + dx, y + dy, z + dz, c);
    }
    return this;
  }
  /** All voxels as [x,y,z,colour]. */
  list(): [number, number, number, string][] {
    const out: [number, number, number, string][] = [];
    for (const [k, c] of this.vox) out.push([(k & 255) - OFF, ((k >> 8) & 255) - OFF, ((k >> 16) & 255) - OFF, c]);
    return out;
  }
}

export interface Rendered {
  canvas: Canvas;
  /** Anchor pixel: centre of the top face of the layer at z = anchorZ above the origin column. */
  ax: number;
  ay: number;
}

/** Voxel stamp: 4 wide, 5 tall. step in z = 3 px. */
const STAMP: string[] = [
  '.TT.',
  'TTTT',
  'LLRR',
  'LLRR',
  'LLRR',
];

export interface RenderOptions {
  /** Swap x and y so the model faces lower-left instead of lower-right. */
  mirror?: boolean;
  /** Layer whose top face centre becomes the anchor. */
  anchorZ?: number;
  /** A second model drawn on top of everything else (e.g. a prop held in front). */
  front?: Model;
}

export function renderModel(m: Model, opts: RenderOptions = {}): Rendered {
  const mirror = opts.mirror ?? false;
  const anchorZ = opts.anchorZ ?? 1;
  const vs = m.list().map(([x, y, z, c]) => (mirror ? { x: y, y: x, z, c } : { x, y, z, c }));
  if (vs.length === 0) throw new Error('empty model');
  // painter's order: back to front
  vs.sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
  if (opts.front) {
    const fv = opts.front.list().map(([x, y, z, c]) => (mirror ? { x: y, y: x, z, c } : { x, y, z, c }));
    fv.sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
    vs.push(...fv);
  }
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const v of vs) {
    const sx = 2 * (v.x - v.y);
    const sy = v.x + v.y - 3 * v.z;
    minX = Math.min(minX, sx); maxX = Math.max(maxX, sx + 3);
    minY = Math.min(minY, sy); maxY = Math.max(maxY, sy + 4);
  }
  const canvas = new Canvas(maxX - minX + 1, maxY - minY + 1);
  const cache = new Map<string, [number, number, number]>();
  const shades = (c: string): [number, number, number] => {
    let s = cache.get(c);
    if (!s) {
      s = [shadeTop(c), shadeDark(c), shadeMid(c)];
      cache.set(c, s);
    }
    return s;
  };
  for (const v of vs) {
    const [top, dark, mid] = shades(v.c);
    const ox = 2 * (v.x - v.y) - minX;
    const oy = v.x + v.y - 3 * v.z - minY;
    STAMP.forEach((row, j) => {
      for (let i = 0; i < 4; i++) {
        const ch = row[i];
        if (ch === '.') continue;
        // L = left face (+y) medium, R = right face (+x) dark
        const col = ch === 'T' ? top : ch === 'L' ? mid : dark;
        canvas.setRaw(ox + i, oy + j, 0x1000000 | col);
      }
    });
  }
  return { canvas, ax: 2 - minX, ay: 1 - 3 * anchorZ - minY };
}

/** Place a rendered model on a fixed-size canvas so that its anchor lands on (AX, AY). */
export function placeOn(r: Rendered, W: number, H: number, AX: number, AY: number): Canvas {
  const out = new Canvas(W, H);
  out.blit(r.canvas, AX - r.ax, AY - r.ay);
  return out;
}
