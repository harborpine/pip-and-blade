/**
 * Reusable voxel parts: bases, legs, torsos, heads, eyes, arms, props.
 * Every character recipe is a combination of these plus a colour set.
 */
import type { Model } from './voxel';

/** z of the first layer a character stands on (the base occupies z = 0 and 1). */
export const FEET = 2;

export type BaseKind = 'hero' | 'enemy' | 'boss';

/** Round miniature base. Heroes: light cream. Enemies: dark slate. Bosses: larger, dark, with a gold rim. */
export function addBase(m: Model, kind: BaseKind, radius: number): void {
  const ring = kind === 'hero' ? 'c' : kind === 'enemy' ? 's' : 's';
  const top = kind === 'hero' ? 'w' : kind === 'enemy' ? 'k' : 'k';
  m.cyl(0, 0, 0, 0, radius, ring);
  m.cyl(0, 0, 1, 1, radius, ring);
  m.cyl(0, 0, 1, 1, radius - 1, top);
  if (kind === 'boss') {
    // thin gold rim on the bottom layer ring
    for (let x = -radius - 1; x <= radius + 1; x++) {
      for (let y = -radius - 1; y <= radius + 1; y++) {
        const d = x * x + y * y;
        if (m.has(x, y, 0) && d > (radius - 1) * (radius - 1) + 1.5) m.set(x, y, 1, 'y');
      }
    }
    m.cyl(0, 0, 1, 1, radius - 2, top);
  }
}

/** Two legs side by side along y. */
export function legs(m: Model, z0: number, z1: number, col: string, o: { x0?: number; x1?: number; yIn?: number; yOut?: number } = {}): void {
  const x0 = o.x0 ?? -1;
  const x1 = o.x1 ?? 0;
  const yIn = o.yIn ?? 1;
  const yOut = o.yOut ?? 2;
  m.boxM(x0, yIn, z0, x1, yOut, z1, col);
}

/** Feet: slightly longer boots on the bottom layer of legs. */
export function boots(m: Model, z: number, col: string, yIn = 1, yOut = 2, x1 = 1): void {
  m.boxM(-1, yIn, z, x1, yOut, z, col);
}

/** Torso box centred on x = 0 and y = 0. */
export function torso(m: Model, z0: number, z1: number, hw: number, hd: number, col: string): void {
  m.box(-hd, -hw, z0, hd, hw, z1, col);
}

/** Big rounded head. hw = half width (y), hd = half depth (x). */
export function head(m: Model, z0: number, z1: number, hw: number, hd: number, col: string, cx = 0): void {
  m.box(cx - hd, -hw, z0, cx + hd, hw, z1, col);
  for (const z of [z0, z1]) {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) m.del(cx + sx * hd, sy * hw, z);
  }
}

/** Two eyes on the front (+x) face of a head. */
export function eyes(m: Model, x: number, z: number, y = 2, col = 'k', tall = false): void {
  for (const s of [-1, 1]) {
    m.set(x, s * y, z, col);
    if (tall) m.set(x, s * y, z + 1, col);
  }
}

/** One arm hanging at the side. side = +1 (near, screen-left) or -1 (far). */
export function arm(m: Model, side: 1 | -1, z0: number, z1: number, col: string, y = 3, x0 = -1, x1 = 0): void {
  m.box(x0, side * y, z0, x1, side * y, z1, col);
}

/** A flat shield slab on the near side (+y) or far side. Width along x, height along z. */
export function slab(m: Model, y: number, x0: number, x1: number, z0: number, z1: number, col: string, rim?: string): void {
  m.box(x0, y, z0, x1, y, z1, col);
  if (rim) {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (x === x0 || x === x1 || z === z0 || z === z1) m.set(x, y, z, rim);
    }
  }
}

/** A sword-like prop: handle then blade along an axis. Direction: 'z' up, 'x' forward. */
export function blade(m: Model, x: number, y: number, z: number, len: number, dir: 'x' | 'z', blade: string, hilt: string): void {
  const dx = dir === 'x' ? 1 : 0;
  const dz = dir === 'z' ? 1 : 0;
  m.set(x, y, z, hilt);
  m.set(x + dx, y, z + dz, hilt);
  if (dir === 'x') {
    m.set(x + 1, y - 1, z, hilt);
    m.set(x + 1, y + 1, z, hilt);
  } else {
    m.set(x - 1, y, z + 1, hilt);
    m.set(x + 1, y, z + 1, hilt);
  }
  for (let i = 2; i < len; i++) m.set(x + dx * i, y, z + dz * i, blade);
}

/** Fill a cone (pointy hat / hood) rising from z0, radius shrinking each layer. */
export function cone(m: Model, cx: number, cy: number, z0: number, r0: number, height: number, col: string, shrinkEvery = 1): void {
  for (let i = 0; i < height; i++) {
    const r = Math.max(0, r0 - Math.floor(i / shrinkEvery));
    m.cyl(cx, cy, z0 + i, z0 + i, r, col);
  }
}

/** Pseudo-random (deterministic) hash used for speckles. */
export function hash3(x: number, y: number, z: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 1274126177) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

/** The largest x that has a voxel at (y, z): the front surface of a blobby body. */
export function frontX(m: Model, y: number, z: number): number {
  for (let x = 40; x >= -40; x--) if (m.has(x, y, z)) return x;
  return 0;
}
