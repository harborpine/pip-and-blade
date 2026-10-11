/**
 * Backgrounds (render: 'scene'), 180x320: each is a tabletop diorama. A lit board the miniatures
 * stand on, a dark backdrop in flat stepped layers, and a few voxel props (drawn by the same
 * isometric renderer as the characters) standing along the far edge. Large flat shapes, no
 * dithering; the lower part is the calmest and darkest so units, bars and the tray read.
 */
import { Canvas } from './canvas';
import type { Sprite } from './sheet';
import { miniDie } from './toyicons';
import { Model, renderModel } from './voxel';

export const SCENE_W = 180;
export const SCENE_H = 320;
/** Where the board's far edge is. Units stand below this line. */
const HORIZON = 84;

const prop = (m: Model): Canvas => renderModel(m).canvas.outline();

function oak(leaf: string, trunk = 'z'): Canvas {
  const m = new Model();
  m.box(0, 0, 0, 1, 1, 3, trunk);
  m.box(-2, -2, 4, 3, 3, 7, leaf);
  for (const x of [-2, 3]) for (const y of [-2, 3]) for (const z of [4, 7]) m.del(x, y, z);
  m.box(-1, -1, 8, 2, 2, 8, leaf);
  return prop(m);
}

function pine(leaf: string, trunk = 'z'): Canvas {
  const m = new Model();
  m.box(0, 0, 0, 1, 1, 1, trunk);
  m.box(-2, -2, 2, 3, 3, 3, leaf);
  m.box(-1, -1, 4, 2, 2, 6, leaf);
  m.box(0, 0, 7, 1, 1, 9, leaf);
  return prop(m);
}

function rock(col = 's'): Canvas {
  const m = new Model();
  m.box(0, 0, 0, 3, 2, 1, col);
  m.box(1, 0, 2, 2, 1, 2, col);
  return prop(m);
}

function pillar(h: number, col = 's', cap = 'g'): Canvas {
  const m = new Model();
  m.box(-1, -1, 0, 2, 2, 0, cap);
  m.box(0, 0, 1, 1, 1, h, col);
  m.box(-1, -1, h + 1, 2, 2, h + 1, cap);
  return prop(m);
}

function basalt(h: number, glow: boolean): Canvas {
  const m = new Model();
  m.box(0, 0, 0, 2, 2, h, 's');
  m.box(3, 0, 0, 4, 1, Math.max(1, h - 3), 's');
  m.box(0, 3, 0, 1, 4, Math.max(1, h - 5), 's');
  if (glow) { m.set(1, 1, h, 'o'); m.set(3, 0, Math.max(1, h - 3), 'o'); }
  return prop(m);
}

function bigDie(col: string, pip: string): Canvas {
  return prop(miniDie(new Model(), 5, 5, col, pip));
}

/** A flat stepped triangle standing on baseY: a far pine, a spire, a roof. */
function stepped(c: Canvas, cx: number, baseY: number, halfW: number, h: number, col: string, steps = 5): void {
  for (let i = 0; i < steps; i++) {
    const hw = Math.round((halfW * (steps - i)) / steps);
    const y1 = baseY - Math.round((h * i) / steps);
    const y0 = baseY - Math.round((h * (i + 1)) / steps);
    c.rect(cx - hw, y0, hw * 2, y1 - y0, col);
  }
}

/** A flat arch (dark opening in a wall), standing on baseY. */
function arch(c: Canvas, cx: number, baseY: number, halfW: number, h: number, col: string): void {
  c.rect(cx - halfW, baseY - h + 8, halfW * 2, h - 8, col);
  c.rect(cx - halfW + 3, baseY - h + 3, halfW * 2 - 6, 5, col);
  c.rect(cx - halfW + 7, baseY - h, halfW * 2 - 14, 3, col);
}

/** Stand a prop with the middle of its bottom edge at (x, y). */
function stand(c: Canvas, p: Canvas, x: number, y: number): void {
  c.blit(p, Math.round(x - p.w / 2), y - p.h);
}

/**
 * The board: a lit far strip, then the near part a shade darker. The join follows the board's
 * diamond grid (a zigzag), so it reads as rows of big tiles rather than a second horizon.
 */
function board(c: Canvas, far: string, near: string, line: string, edge: string, joinY = 150): void {
  for (let y = HORIZON; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const wave = Math.abs((((x + 24) % 96) + 96) % 96 - 48) / 2;
      c.set(x, y, y < joinY - 12 + wave ? far : near);
      const a = (((x + 2 * y) % 96) + 96) % 96;
      const b = (((2 * y - x) % 96) + 96) % 96;
      if (y > HORIZON + 1 && (a < 2 || b < 2)) c.set(x, y, line);
    }
  }
  c.rect(0, HORIZON, c.w, 2, edge);
}

function stars(c: Canvas, col: string, pts: [number, number][]): void {
  for (const [x, y] of pts) c.set(x, y, col);
}

const STARS: [number, number][] = [[14, 9], [47, 5], [78, 14], [109, 7], [141, 12], [166, 4], [30, 22], [95, 26], [152, 28]];

function act1(): Canvas {
  const c = new Canvas(SCENE_W, SCENE_H);
  c.rect(0, 0, SCENE_W, HORIZON, 'k');
  stars(c, 'p', STARS);
  // far hills, then two rows of flat stepped pines
  for (const [x, hw, h] of [[30, 60, 58], [120, 70, 66], [190, 50, 50]] as [number, number, number][]) stepped(c, x, HORIZON, hw, h, 's-', 6);
  for (const [x, hw, h] of [[10, 22, 52], [52, 26, 62], [96, 22, 48], [134, 26, 58], [176, 22, 54]] as [number, number, number][]) stepped(c, x, HORIZON, hw, h, 'f-');
  for (const [x, hw, h] of [[-2, 18, 34], [34, 16, 28], [76, 18, 38], [116, 16, 30], [156, 18, 36]] as [number, number, number][]) stepped(c, x, HORIZON, hw, h, 'f');
  board(c, 'e-', 'f-', 'f', 'e');
  stand(c, pine('f'), 70, HORIZON + 6);
  stand(c, oak('e'), 112, HORIZON + 8);
  stand(c, oak('e'), 30, HORIZON + 14);
  stand(c, pine('f'), 152, HORIZON + 16);
  stand(c, rock(), 90, HORIZON + 12);
  return c;
}

function act2(): Canvas {
  const c = new Canvas(SCENE_W, SCENE_H);
  c.rect(0, 0, SCENE_W, HORIZON, 'k');
  // the far wall of the vault, with dark arches and a waterline
  c.rect(0, 18, SCENE_W, HORIZON - 18, 'i-');
  c.rect(0, 18, SCENE_W, 3, 'n-');
  for (const x of [28, 90, 152]) arch(c, x, HORIZON, 22, 52, 'k');
  for (const x of [28, 90, 152]) arch(c, x, HORIZON, 16, 40, 'n-');
  c.rect(0, HORIZON - 10, SCENE_W, 10, 'a-');
  board(c, 'a', 'a-', 'n-', 't');
  // pillars standing in the shallows, a broken one, rubble
  stand(c, pillar(11), 26, HORIZON + 10);
  stand(c, pillar(11), 154, HORIZON + 10);
  stand(c, pillar(5), 64, HORIZON + 6);
  stand(c, pillar(8), 118, HORIZON + 8);
  stand(c, rock('g'), 92, HORIZON + 14);
  return c;
}

function act3(): Canvas {
  const c = new Canvas(SCENE_W, SCENE_H);
  c.rect(0, 0, SCENE_W, HORIZON, 'k');
  stars(c, 'o', STARS.slice(0, 5));
  // far spires against an ember glow, then nearer dark crags
  c.rect(0, HORIZON - 26, SCENE_W, 26, 'z-');
  c.rect(0, HORIZON - 8, SCENE_W, 8, 'x-');
  for (const [x, hw, h] of [[20, 16, 70], [64, 12, 54], [100, 18, 78], [142, 12, 58], [172, 14, 66]] as [number, number, number][]) stepped(c, x, HORIZON, hw, h, 'i-', 6);
  for (const [x, hw, h] of [[0, 20, 36], [44, 16, 26], [82, 14, 30], [122, 18, 34], [160, 14, 24]] as [number, number, number][]) stepped(c, x, HORIZON, hw, h, 'k', 4);
  board(c, 'z', 'z-', 'x-', 'o');
  stand(c, basalt(9, true), 28, HORIZON + 12);
  stand(c, basalt(6, false), 72, HORIZON + 6);
  stand(c, basalt(10, true), 150, HORIZON + 14);
  stand(c, basalt(5, true), 112, HORIZON + 8);
  stand(c, rock('s'), 92, HORIZON + 14);
  return c;
}

function menu(): Canvas {
  const c = new Canvas(SCENE_W, SCENE_H);
  // a room in the dark behind the table: a window and shelves as flat shapes
  c.rect(0, 0, SCENE_W, HORIZON, 'k');
  c.rect(0, 30, SCENE_W, HORIZON - 30, 'i-');
  c.rect(66, 8, 48, 46, 'n-');
  c.rect(70, 12, 40, 38, 'i-');
  c.rect(89, 12, 2, 38, 'n-'); c.rect(70, 30, 40, 2, 'n-');
  stars(c, 'p', [[76, 18], [100, 22], [82, 40], [104, 42]]);
  // the table edge and the felt
  board(c, 'f', 'f-', 'e-', 'e', 176);
  c.rect(0, HORIZON - 8, SCENE_W, 8, 'u');
  c.rect(0, HORIZON - 8, SCENE_W, 2, 'h');
  c.rect(0, HORIZON - 2, SCENE_W, 2, 'z');
  // toys on the table
  stand(c, bigDie('w', 'k'), 30, HORIZON + 22);
  stand(c, bigDie('r', 'w'), 150, HORIZON + 30);
  stand(c, bigDie('b', 'w'), 62, HORIZON + 12);
  stand(c, bigDie('y', 'k'), 118, HORIZON + 14);
  stand(c, bigDie('v', 'w'), 14, 300);
  stand(c, bigDie('w', 'k'), 166, 286);
  return c;
}

export function buildScenes(): Map<string, Sprite> {
  const out = new Map<string, Sprite>();
  const add = (id: string, canvas: Canvas): void => {
    out.set(id, { canvas, ax: canvas.w / 2, ay: canvas.h / 2, render: 'scene' });
  };
  add('bg.act1', act1());
  add('bg.act2', act2());
  add('bg.act3', act3());
  add('bg.menu', menu());
  return out;
}
