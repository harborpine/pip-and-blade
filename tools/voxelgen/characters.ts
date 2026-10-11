/** Turns character recipes (heroes, enemies, bosses) into finished sprites with a shared canvas size per class. */
import type { Canvas } from './canvas';
import { HERO_RECIPES } from './heroes';
import { ENEMY_RECIPES } from './enemies';
import { BOSS_RECIPES } from './bosses';
import type { Sprite } from './sheet';
import type { Model } from './voxel';
import { placeOn, renderModel } from './voxel';

type Recipes = Record<string, () => Model>;

function buildClass(prefix: string, recipes: Recipes, mirror: boolean, anchorZ: number): Map<string, Sprite> {
  const rendered = Object.entries(recipes).map(([id, make]) => ({ id, r: renderModel(make(), { mirror, anchorZ }) }));
  if (rendered.length === 0) return new Map();
  const pad = 2;
  const left = Math.max(...rendered.map(({ r }) => r.ax));
  const right = Math.max(...rendered.map(({ r }) => r.canvas.w - r.ax));
  const up = Math.max(...rendered.map(({ r }) => r.ay));
  const down = Math.max(...rendered.map(({ r }) => r.canvas.h - r.ay));
  // even width so the anchor sits near the middle
  const W = left + right + pad * 2;
  const H = up + down + pad * 2;
  const out = new Map<string, Sprite>();
  for (const { id, r } of rendered) {
    const placed: Canvas = placeOn(r, W, H, left + pad, up + pad).outline();
    out.set(`${prefix}.${id}`, { canvas: placed, ax: left + pad, ay: up + pad });
  }
  return out;
}

export function buildCharacters(): Map<string, Sprite> {
  const out = new Map<string, Sprite>();
  for (const [k, v] of buildClass('hero', HERO_RECIPES, false, 1)) out.set(k, v);
  for (const [k, v] of buildClass('enemy', ENEMY_RECIPES, true, 1)) out.set(k, v);
  for (const [k, v] of buildClass('boss', BOSS_RECIPES, true, 1)) out.set(k, v);
  return out;
}
