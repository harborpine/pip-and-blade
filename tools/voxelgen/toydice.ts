/**
 * The 0.2.0 dice: a bigger voxel cube in the hero's colour. The face towards the player's left is
 * an ivory plate that carries the effect; the face towards the right is a dark plate that carries
 * the number (white block digits on it are the highest contrast the palette offers).
 *
 * Every `die.*` sprite except `die.blank` shares one canvas and one anchor (the centre of the
 * die's footprint), so they stack without any arithmetic:
 *   die.<hero>        the body
 *   die.used          a grey, sunk body: draw it INSTEAD of the hero body
 *   die.face_<effect> the effect as a toy standing against the left plate: draw over the body
 *   die.face_blank    covers BOTH plates (ivory, slashed): draw over the body, and draw no number
 *   die.locked / die.jammed   overlays: draw over body and face
 *   die.cursed        covers BOTH plates (lilac, cracked): draw over the body instead of a face and number
 * `die.blank` is a normal 36 px icon.
 */
import { Canvas } from './canvas';
import { blankIcon } from './icons';
import type { Sprite } from './sheet';
import { lifts, sub, toy, wall } from './toyicons';
import { Model, placeOn, renderModel } from './voxel';

const N = 10; // footprint
const TALL = 8;
const E = N - 1;

function dieModel(body: string, left: string, right: string, tall = TALL): Model {
  const m = new Model();
  m.box(0, 0, 0, E, E, tall - 1, body);
  for (const x of [0, E]) for (const y of [0, E]) for (const z of [0, tall - 1]) m.del(x, y, z);
  m.box(1, E, 1, E - 1, E, tall - 2, left); // left plate (+y)
  m.box(E, 1, 1, E, E - 1, tall - 2, right); // right plate (+x)
  return m;
}

const PAD = 1;
const frame = (() => {
  const r = renderModel(dieModel('w', 'c', 'k'), { anchorZ: 0 });
  return { w: r.canvas.w + PAD * 2, h: r.canvas.h + PAD * 2, ax: r.ax + PAD, ay: r.ay + PAD };
})();

function place(m: Model): Canvas {
  return placeOn(renderModel(m, { anchorZ: 0 }), frame.w, frame.h, frame.ax, frame.ay).outline();
}

/** Where the die stands: the centre of its footprint on the table, in native pixels. */
const FOOT = { x: frame.ax, y: frame.ay + E };

const sprite = (canvas: Canvas): Sprite => ({ canvas, ax: FOOT.x, ay: FOOT.y, render: 'voxel' });

/**
 * Geometry for the UI, in native pixels on the shared die canvas. Plate centres are where the
 * effect (left) and the number (right) sit; both plates are 16 wide and 18 tall and lean 1 px
 * per 2 px (left plate falls to the right, right plate rises to the right).
 */
export const DIE_FACE = {
  w: frame.w,
  h: frame.h,
  foot: FOOT,
  left: { x: FOOT.x - N, y: FOOT.y - 4 },
  right: { x: FOOT.x + N, y: FOOT.y - 4 },
  top: { x: FOOT.x, y: FOOT.y - 3 * TALL - 1 },
};

/** Only the pixels that differ from the plain die: an overlay to lay over any hero's die. */
function overlay(withExtras: Model): Canvas {
  const plain = place(dieModel('w', 'c', 'k'));
  const full = place(withExtras);
  const out = new Canvas(frame.w, frame.h);
  for (let i = 0; i < out.px.length; i++) if (full.px[i] !== plain.px[i]) out.px[i] = full.px[i] as number;
  return out;
}

function lockedModel(): Model {
  const m = dieModel('w', 'c', 'k');
  const z = TALL - 1;
  for (let i = 1; i < E; i++) {
    m.set(i, 0, z, 'y'); m.set(i, E, z, 'y'); m.set(0, i, z, 'y'); m.set(E, i, z, 'y');
  }
  for (const [x, y] of [[1, 1], [1, E - 1], [E - 1, 1], [E - 1, E - 1]] as [number, number][]) m.set(x, y, z, 'y');
  return m;
}

/** A purple crack running down across both plates and over the top. */
function cursedModel(): Model {
  const m = dieModel('w', 'p', 'p');
  const z = TALL - 1;
  for (const [x, zz] of [[5, 6], [5, 5], [4, 5], [4, 4], [3, 4], [3, 3], [4, 3], [4, 2], [5, 2], [5, 1], [4, 1], [5, 0], [6, 4], [7, 5], [2, 2]] as [number, number][]) m.set(x, E, zz, 'v');
  for (const [y, zz] of [[5, 6], [4, 6], [4, 5], [5, 5], [5, 4], [5, 3], [6, 3], [6, 2], [5, 2], [6, 1], [6, 0], [3, 4], [2, 3], [7, 4]] as [number, number][]) m.set(E, y, zz, 'v');
  for (const [x, y] of [[5, 9], [5, 8], [6, 8], [6, 7], [7, 6], [8, 6], [8, 5], [9, 5], [6, 6], [5, 5], [5, 4], [4, 4]] as [number, number][]) m.set(x, y, z, 'v');
  return m;
}

/** A blank face: both plates ivory (no number plate) and a bold slash across the left one. */
function blankModel(): Model {
  const m = dieModel('w', 'c', 'c');
  for (let i = 0; i < 6; i++) {
    m.set(2 + i, E, 1 + i, 's');
    if (i < 5) { m.set(3 + i, E, 1 + i, 's'); m.set(2 + i, E, 2 + i, 's'); }
  }
  return m;
}

/** A steel chain belted round the die. */
function jammedModel(): Model {
  const m = dieModel('w', 'c', 'k');
  for (let i = -1; i <= E + 1; i++) {
    const c = i % 2 === 0 ? 'g' : 's';
    m.box(i, E + 1, 3, i, E + 1, 4, c); // across the left plate
    m.box(E + 1, i, 3, E + 1, i, 4, c); // across the right plate
  }
  return m;
}

/** A toy standing against the left plate, drawn on the shared die canvas. */
function face(m: Model): Sprite {
  const r = renderModel(m).canvas;
  const o = new Canvas(r.w + 2, r.h + 2);
  o.blit(r, 1, 1);
  const art = o.outline();
  const c = new Canvas(frame.w, frame.h);
  const x = Math.max(0, Math.min(frame.w - art.w, Math.round(DIE_FACE.left.x - art.w / 2)));
  const y = Math.max(0, Math.min(frame.h - art.h, Math.round(DIE_FACE.left.y - art.h / 2) - 1));
  if (art.w > 24 || art.h > frame.h) throw new Error(`die face art ${art.w}x${art.h} is too big`);
  c.blit(art, x, y);
  return sprite(c);
}

const F = (rows: string[], lift: number[] = [], d = 1): Model => wall(new Model(), rows, 0, d - 1, lift);

function faces(): Record<string, Sprite> {
  return {
    damage: face(F(sub([
      '.....EE',
      '....EBB',
      '...EBB.',
      'G.EBB..',
      '.GBB...',
      '.HGG...',
      'H..G...',
    ], { E: 'w', B: 'g', G: 'y', H: 'u' }), [], 2)),
    shield: face(F(sub([
      'RRRRRR',
      'RFEEFR',
      'REEEER',
      'RFEEFR',
      '.RFFR.',
      '..RR..',
    ], { R: 'n', F: 'b', E: 'w' }), lifts(3, 3), 2)),
    heal: face(F([
      'wwwwww',
      'wweeww',
      'weeeew',
      'weeeew',
      'wweeww',
      'wwwwww',
    ], [], 2)),
    weaken: face(F(sub([
      '......EE',
      '.....EBB',
      '........',
      'G.EB....',
      '.GBB.v.v',
      '.HGG.vvv',
      'H..G..v.',
    ], { E: 'w', B: 'g', G: 'y', H: 'u' }), [], 2)),
    focus: face((() => {
      const m = new Model();
      m.box(0, 0, 0, 4, 4, 4, 'w');
      m.box(2, 4, 1, 2, 4, 3, 'e'); m.box(1, 4, 2, 3, 4, 2, 'e');
      m.set(2, 2, 4, 'k'); m.set(4, 1, 3, 'k'); m.set(4, 3, 1, 'k');
      return m;
    })()),
  };
}

/** Every die sprite, keyed by asset id. */
export function buildToyDice(heroColours: Record<string, string>): Map<string, Sprite> {
  const out = new Map<string, Sprite>();
  for (const [id, col] of Object.entries(heroColours)) out.set(`die.${id}`, sprite(place(dieModel(col, 'c', 'k'))));
  out.set('die.locked', sprite(overlay(lockedModel())));
  out.set('die.jammed', sprite(overlay(jammedModel())));
  out.set('die.cursed', sprite(overlay(cursedModel())));
  out.set('die.used', sprite(place(dieModel('s', 'g', 'k', TALL - 3))));
  out.set('die.blank', toy(blankIcon()));
  for (const [k, s] of Object.entries(faces())) out.set(`die.face_${k}`, s);
  out.set('die.face_blank', sprite(overlay(blankModel())));
  return out;
}

/** Die ids this module adds beyond the original asset list. */
export const NEW_DIE_IDS = ['die.face_damage', 'die.face_shield', 'die.face_heal', 'die.face_weaken', 'die.face_focus', 'die.face_blank'] as const;
