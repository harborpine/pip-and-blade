/**
 * The interface kit: toy-like buttons, panels, the dice tray, bubbles, chips, bars, tabs and toggles.
 *
 * These are flat-fronted pieces (render: 'kit'), drawn in the shared palette with the same logic
 * as the miniatures: a lighter top bevel, the plain colour on the face, a darker slab of
 * thickness underneath, and a 1 px ink outline. One native pixel is meant to be shown as
 * 2 CSS px (the same pixel size as the characters), so the outline is 2 CSS px on screen.
 * Stretchable pieces carry 9-slice insets [top, right, bottom, left] in native pixels.
 * Faces are flat colour so they stretch without smearing.
 *
 * Exceptions, meant for 1 CSS px per pixel: kit.lock_open / kit.lock_closed / kit.lock_chain
 * (44x44, a whole tap target: a doubled-pixel plate with a toy standing on it).
 */
import { Canvas } from './canvas';
import { buildFonts } from './font';
import type { Sprite } from './sheet';
import { chainLinks, padlock, toy } from './toyicons';
import { Model } from './voxel';

type Slice = [number, number, number, number];

const CUT: Record<number, number[]> = { 0: [], 1: [1], 2: [2, 1], 3: [3, 2, 1] };

/** Filled rectangle with pixel-stepped round corners (rt = top radius, rb = bottom radius). */
function rr(c: Canvas, x: number, y: number, w: number, h: number, rt: number, spec: string, rb = rt): void {
  const top = CUT[rt] ?? [];
  const bot = CUT[rb] ?? [];
  for (let j = 0; j < h; j++) {
    const k = j < top.length ? (top[j] as number) : h - 1 - j < bot.length ? (bot[h - 1 - j] as number) : 0;
    c.rect(x + k, y + j, w - 2 * k, 1, spec);
  }
}

/** Stretch a 9-slice sprite to a native size (corners kept, edges and centre stretched). */
export function stretch(s: Sprite, W: number, H: number): Canvas {
  const [t, r, b, l] = s.slice ?? [0, 0, 0, 0];
  const src = s.canvas;
  const out = new Canvas(W, H);
  const mapAxis = (i: number, n: number, sn: number, a: number, z: number): number => {
    if (i < a) return i;
    if (i >= n - z) return sn - (n - i);
    const mid = sn - a - z;
    return a + Math.min(mid - 1, Math.floor(((i - a) * mid) / Math.max(1, n - a - z)));
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out.px[y * W + x] = src.get(mapAxis(x, W, src.w, l, r), mapAxis(y, H, src.h, t, b));
  return out;
}

const kit = (canvas: Canvas, slice?: Slice): Sprite => ({ canvas, ax: canvas.w / 2, ay: canvas.h / 2, render: 'kit', ...(slice ? { slice } : {}) });

// ------------------------------------------------------------------ buttons

interface ButtonLook { face: string; bevel: string; side: string; foot: string }

const THICK = 4;

/** A chunky button. Raised: a slab of thickness below the face. Sunk: the face dropped onto the table. */
function button(look: ButtonLook, sunk: boolean): Sprite {
  const W = 24;
  const H = 24;
  const c = new Canvas(W, H);
  const oy = sunk ? THICK - 1 : 0;
  const t = sunk ? 1 : THICK;
  rr(c, 0, oy, W, H - oy, 3, 'k');
  rr(c, 1, oy + 1, W - 2, H - oy - 2, 2, look.side);
  c.rect(3, H - 2, W - 6, 1, look.foot);
  rr(c, 1, oy + 1, W - 2, H - oy - 2 - t, 2, look.face);
  if (!sunk) {
    c.rect(3, oy + 1, W - 6, 1, look.bevel);
    c.rect(2, oy + 2, 1, 1, look.bevel);
  }
  return kit(c, [oy + 4, 4, t + 4, 4]);
}

const IVORY: ButtonLook = { face: 'c', bevel: 'w', side: 'h', foot: 'u' };
const GOLD: ButtonLook = { face: 'y', bevel: 'y+', side: 'o', foot: 'o-' };
const RED: ButtonLook = { face: 'r', bevel: 'r+', side: 'x', foot: 'x-' };
const GREY: ButtonLook = { face: 'g', bevel: 'g', side: 's', foot: 's' };

// ------------------------------------------------------------------ panels

function panel(): Sprite {
  const c = new Canvas(24, 24);
  rr(c, 0, 0, 24, 24, 3, 'k');
  rr(c, 1, 1, 22, 22, 2, 'h');
  rr(c, 1, 1, 22, 20, 2, 'c');
  c.rect(3, 1, 18, 1, 'w');
  return kit(c, [5, 5, 6, 5]);
}

/** Dark inset panel: pressed into the table, shadow along the top, a lit lip along the bottom. */
function panelDark(): Sprite {
  const c = new Canvas(24, 24);
  rr(c, 0, 0, 24, 24, 3, 'k');
  rr(c, 1, 1, 22, 22, 2, 's-');
  c.rect(3, 1, 18, 1, 'k');
  c.rect(3, 22, 18, 1, 's');
  return kit(c, [5, 5, 5, 5]);
}

/** A card that is picked: the light panel inside a gold frame. */
function panelSelected(): Sprite {
  const c = new Canvas(24, 24);
  rr(c, 0, 0, 24, 24, 3, 'k');
  rr(c, 1, 1, 22, 22, 2, 'o');
  rr(c, 1, 1, 22, 20, 2, 'y');
  c.rect(3, 1, 18, 1, 'y+');
  rr(c, 3, 3, 18, 16, 1, 'c');
  return kit(c, [6, 6, 7, 6]);
}

/** Bottom sheet body: round at the top, square at the bottom (it runs off the screen edge). */
function sheet(): Sprite {
  const c = new Canvas(24, 24);
  rr(c, 0, 0, 24, 24, 3, 'k', 0);
  rr(c, 1, 1, 22, 23, 2, 'c', 0);
  c.rect(3, 1, 18, 1, 'w');
  return kit(c, [6, 5, 3, 5]);
}

/** The little grab bar at the top of a sheet (fixed, centre it 6 CSS px below the sheet's top edge). */
function sheetGrip(): Sprite {
  const c = new Canvas(20, 4);
  rr(c, 0, 0, 20, 4, 1, 'u');
  c.rect(1, 1, 18, 2, 'h');
  return kit(c);
}

/** The dice tray: a wooden rim round a felt floor. */
function tray(): Sprite {
  const W = 32;
  const H = 32;
  const c = new Canvas(W, H);
  rr(c, 0, 0, W, H, 3, 'k');
  rr(c, 1, 1, W - 2, H - 2, 2, 'u');
  c.rect(3, 1, W - 6, 1, 'h');
  c.rect(3, H - 3, W - 6, 2, 'z');
  rr(c, 4, 4, W - 8, H - 10, 1, 'k');
  c.rect(5, 5, W - 10, H - 12, 'a');
  c.rect(5, 5, W - 10, 2, 'a-');
  c.rect(5, 5, 1, H - 12, 'a-');
  return kit(c, [8, 7, 9, 7]);
}

/** The socket a die sits in: a diamond pressed into the felt, the size of a die's footprint. */
function slot(): Sprite {
  const W = 46;
  const H = 25;
  const c = new Canvas(W, H);
  const inside = (x: number, y: number): boolean => Math.abs(x - (W - 1) / 2) / 2 + Math.abs(y - (H - 1) / 2) <= 11.6;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      c.set(x, y, !inside(x, y - 2) ? 'k' : !inside(x, y + 1) ? 'a+' : 'a-');
    }
  }
  return kit(c);
}

// ------------------------------------------------------------------ small parts

function bubble(): Sprite {
  const c = new Canvas(20, 18);
  rr(c, 0, 0, 20, 18, 3, 'k');
  rr(c, 1, 1, 18, 16, 2, 'w');
  c.rect(3, 16, 14, 1, 'c');
  return kit(c, [4, 4, 4, 4]);
}

/** The pointer under a bubble. Put its top row on the bubble's bottom outline row. */
function bubbleTail(): Sprite {
  const c = new Canvas(9, 5);
  c.ascii(['.wwwwwww.', '.kwwwwwk.', '..kwwwk..', '...kwk...', '....k....'], 0, 0);
  return kit(c);
}

function chip(): Sprite {
  const c = new Canvas(14, 11);
  rr(c, 0, 0, 14, 11, 3, 'k');
  rr(c, 1, 1, 12, 9, 2, 's');
  c.rect(3, 1, 8, 1, 'g');
  return kit(c, [4, 5, 4, 5]);
}

/** Round number badge, 13x13 (26 CSS px). */
function badge(): Sprite {
  const c = new Canvas(13, 13);
  c.disc(6, 6, 6, 'k');
  c.disc(6, 6, 5, 'x');
  c.disc(6, 5.4, 4.6, 'r');
  c.rect(4, 2, 3, 1, 'r+');
  return kit(c);
}

function barFrame(): Sprite {
  const c = new Canvas(12, 8);
  rr(c, 0, 0, 12, 8, 1, 'k');
  c.rect(1, 1, 10, 6, 's-');
  return kit(c, [2, 2, 2, 2]);
}

/** A bar fill: tiles sideways, 6 px tall, sits inside the frame's 1 px outline. */
function barFill(top: string, mid: string, low: string): Sprite {
  const c = new Canvas(4, 6);
  c.rect(0, 0, 4, 1, top);
  c.rect(0, 1, 4, 3, mid);
  c.rect(0, 4, 4, 2, low);
  return kit(c);
}

/** A tab: round on top, open underneath. Active is taller, ivory and has no bottom line so it joins the panel below. */
function tab(active: boolean): Sprite {
  const c = new Canvas(20, 16);
  const oy = active ? 0 : 3;
  rr(c, 0, oy, 20, 16 - oy, 3, 'k', 0);
  rr(c, 1, oy + 1, 18, 16 - oy - (active ? 1 : 2), 2, active ? 'c' : 'h', 0);
  c.rect(3, oy + 1, 14, 1, active ? 'w' : 'h+');
  return kit(c, [oy + 4, 4, 2, 4]);
}

/** Settings switch, 26x14 (52x28 CSS px). */
function toggle(on: boolean): Sprite {
  const c = new Canvas(26, 14);
  rr(c, 0, 1, 26, 12, 3, 'k');
  rr(c, 1, 2, 24, 10, 2, on ? 'e' : 's-');
  c.rect(3, 2, 20, 1, on ? 'e-' : 'k');
  const kx = on ? 12 : 0;
  rr(c, kx, 0, 14, 14, 3, 'k');
  rr(c, kx + 1, 1, 12, 12, 2, 'h');
  rr(c, kx + 1, 1, 12, 10, 2, 'c');
  c.rect(kx + 3, 1, 8, 1, 'w');
  return kit(c);
}

/** A ribbon with folded, forked tails. Stretches sideways; keep it 18 px (36 CSS px) tall. */
function banner(): Sprite {
  const W = 40;
  const H = 18;
  const c = new Canvas(W, H);
  // tails (behind, lower)
  for (const left of [true, false]) {
    const x0 = left ? 0 : W - 9;
    rr(c, x0, 4, 9, 14, 0, 'k');
    c.rect(x0 + 1, 5, 7, 12, 'x');
    // the fork
    for (let i = 0; i < 4; i++) {
      const fx = left ? i : W - 1 - i;
      c.rect(fx, 11 - (3 - i) - 1, 1, 2 * (3 - i) + 2, 'k');
    }
    for (let i = 0; i < 3; i++) {
      const fx = left ? i : W - 1 - i;
      c.clear(fx, 10); c.clear(fx, 11);
      if (i < 2) { c.clear(fx, 9); c.clear(fx, 12); }
      if (i < 1) { c.clear(fx, 8); c.clear(fx, 13); }
    }
  }
  // the band (in front)
  rr(c, 5, 0, W - 10, 15, 1, 'k');
  c.rect(6, 1, W - 12, 13, 'r');
  c.rect(6, 1, W - 12, 1, 'r+');
  c.rect(6, 12, W - 12, 2, 'x');
  return kit(c, [2, 12, 5, 12]);
}

function divider(): Sprite {
  const c = new Canvas(4, 3);
  c.rect(0, 0, 4, 1, 'h');
  c.rect(0, 1, 4, 1, 'u');
  c.rect(0, 2, 4, 1, 'w');
  return kit(c);
}

/**
 * The padlock button under a die, 44x44 to be shown at 1 CSS px per pixel (a full tap target).
 * A small button plate (drawn at the kit's doubled pixel size) with a toy standing on it.
 * Open: ivory and raised. Closed: gold and pressed in. Chain: grey and pressed in (jammed by an enemy).
 */
function lockButton(kind: 'open' | 'closed' | 'chain'): Sprite {
  const c = new Canvas(44, 44);
  const look = kind === 'open' ? IVORY : kind === 'closed' ? GOLD : GREY;
  c.blit(stretch(button(look, kind !== 'open'), 22, 16).scale(2), 0, 12);
  const model = kind === 'chain' ? chainLinks() : padlock(new Model(), kind === 'open');
  const art = toy(model).canvas;
  const box = art.bbox() as { x0: number; y0: number; x1: number; y1: number };
  const lw = box.x1 - box.x0 + 1;
  const lh = box.y1 - box.y0 + 1;
  c.blit(art.crop(box.x0, box.y0, lw, lh), Math.floor((44 - lw) / 2), kind === 'open' ? 0 : Math.min(5, 40 - lh));
  return kit(c);
}

/** Every interface-kit piece, keyed by asset id. */
export function buildKit(): Map<string, Sprite> {
  const out = new Map<string, Sprite>();
  out.set('kit.button', button(IVORY, false));
  out.set('kit.button_pressed', button(IVORY, true));
  out.set('kit.button_disabled', button(GREY, true));
  out.set('kit.button_primary', button(GOLD, false));
  out.set('kit.button_primary_pressed', button(GOLD, true));
  out.set('kit.button_danger', button(RED, false));
  out.set('kit.button_danger_pressed', button(RED, true));
  out.set('kit.panel', panel());
  out.set('kit.panel_dark', panelDark());
  out.set('kit.panel_selected', panelSelected());
  out.set('kit.sheet', sheet());
  out.set('kit.sheet_grip', sheetGrip());
  out.set('kit.tray', tray());
  out.set('kit.slot', slot());
  out.set('kit.bubble', bubble());
  out.set('kit.bubble_tail', bubbleTail());
  out.set('kit.chip', chip());
  out.set('kit.badge', badge());
  out.set('kit.bar_frame', barFrame());
  out.set('kit.bar_hp', barFill('l', 'e', 'e-'));
  out.set('kit.bar_hurt', barFill('y', 'o', 'o-'));
  out.set('kit.bar_shield', barFill('b+', 'b', 'n'));
  out.set('kit.tab', tab(false));
  out.set('kit.tab_active', tab(true));
  out.set('kit.toggle_off', toggle(false));
  out.set('kit.toggle_on', toggle(true));
  out.set('kit.banner', banner());
  out.set('kit.lock_open', lockButton('open'));
  out.set('kit.lock_closed', lockButton('closed'));
  out.set('kit.lock_chain', lockButton('chain'));
  out.set('kit.divider', divider());
  for (const [id, s] of buildFonts().sprites) out.set(id, s);
  return out;
}

/** Kit pieces that must stretch, so must carry `slice`. */
export const STRETCHY_KIT = [
  'kit.button', 'kit.button_pressed', 'kit.button_disabled', 'kit.button_primary', 'kit.button_primary_pressed',
  'kit.button_danger', 'kit.button_danger_pressed', 'kit.panel', 'kit.panel_dark', 'kit.panel_selected', 'kit.sheet',
  'kit.tray', 'kit.bubble', 'kit.chip', 'kit.bar_frame', 'kit.tab', 'kit.tab_active', 'kit.banner',
] as const;
