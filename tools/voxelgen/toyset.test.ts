import { describe, expect, it } from 'vitest';
import { ASSET_LIST } from '../../src/shared/assets';
import type { Canvas } from './canvas';
import { buildFonts } from './font';
import { STRETCHY_KIT } from './kit';
import { allowedColors } from './palette';
import { buildAll } from './sprites';
import { ICON } from './toyicons';

const allowed = allowedColors();
const offPalette = (c: Canvas): number => {
  let bad = 0;
  for (const v of c.px) if (v && !allowed.has(v & 0xffffff)) bad++;
  return bad;
};
const all = buildAll();
/** Categories that must be toys: drawn by the isometric renderer. */
export const VOXEL_CATEGORIES = ['hero', 'enemy', 'boss', 'sym', 'fx', 'kw', 'status', 'intent', 'set', 'ui', 'die', 'item', 'door', 'app'];
const SMALL_ICON_CATEGORIES = ['sym', 'fx', 'kw', 'status', 'intent', 'set', 'ui'];
const SMALL_PUNCTUATION = '.,!?:;-+/%()&' + "'" + '"';

describe('0.2.0 toy set', () => {
  it('every asset id has a sprite', () => {
    for (const a of ASSET_LIST) expect(all.has(a.id), a.id).toBe(true);
  });
  it('icon categories are voxel renders of at least 32 px', () => {
    for (const [id, s] of all) {
      const cat = id.split('.')[0] as string;
      if (!VOXEL_CATEGORIES.includes(cat)) continue;
      expect(s.render, id).toBe('voxel');
      if (SMALL_ICON_CATEGORIES.includes(cat)) {
        expect(Math.min(s.canvas.w, s.canvas.h), id).toBeGreaterThanOrEqual(32);
        if (id !== 'ui.logo' && id !== 'ui.reroll') expect([s.canvas.w, s.canvas.h], id).toEqual([ICON, ICON]);
      }
    }
  });
  it('items and doors are 48 px toys and backgrounds are scenes', () => {
    for (const [id, s] of all) {
      if (id.startsWith('item.') || id.startsWith('door.')) expect([s.canvas.w, s.canvas.h], id).toEqual([48, 48]);
      if (id.startsWith('bg.')) expect([s.render, s.canvas.w, s.canvas.h], id).toEqual(['scene', 180, 320]);
    }
  });
  it('die bodies, faces and overlays share one canvas and anchor', () => {
    const dice = [...all].filter(([id]) => id.startsWith('die.') && id !== 'die.blank').map(([id, s]) => ({ id, s }));
    expect(dice.length).toBeGreaterThanOrEqual(18);
    const first = dice[0]?.s;
    for (const { id, s } of dice) expect([s.canvas.w, s.canvas.h, s.ax, s.ay], id).toEqual([first?.canvas.w, first?.canvas.h, first?.ax, first?.ay]);
  });
  it('kit pieces are marked as kit and the stretchable ones carry 9-slice insets that fit', () => {
    for (const [id, s] of all) if (id.startsWith('kit.')) expect(s.render, id).toBe('kit');
    for (const id of STRETCHY_KIT) {
      const s = all.get(id);
      expect(s, id).toBeDefined();
      const [t, r, b, l] = s?.slice ?? [0, 0, 0, 0];
      expect(Math.max(t, r, b, l), id).toBeGreaterThan(0);
      expect(l + r, id).toBeLessThan(s?.canvas.w ?? 0);
      expect(t + b, id).toBeLessThan(s?.canvas.h ?? 0);
    }
  });
  it('font metrics stay inside their atlases and cover the needed characters', () => {
    const f = buildFonts();
    for (const ch of `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789${SMALL_PUNCTUATION}`) expect(f.info.small.glyphs[ch], ch).toBeDefined();
    for (const ch of '0123456789+-/') expect(f.info.big.glyphs[ch], ch).toBeDefined();
    for (const font of [f.info.small, f.info.big]) {
      for (const id of Object.values(font.sprites)) {
        const atlas = f.sprites.get(id);
        expect(atlas, id).toBeDefined();
        for (const [ch, g] of Object.entries(font.glyphs)) {
          expect(g.x + g.w, `${id} ${ch}`).toBeLessThanOrEqual(atlas?.canvas.w ?? 0);
          expect(g.y + g.h, `${id} ${ch}`).toBeLessThanOrEqual(atlas?.canvas.h ?? 0);
        }
      }
    }
  });
  it('uses only palette-derived colours', () => {
    for (const [id, s] of all) expect(offPalette(s.canvas), id).toBe(0);
  });
  it('is deterministic', () => {
    const again = buildAll();
    expect([...again.keys()]).toEqual([...all.keys()]);
    for (const [id, s] of all) expect(Buffer.compare(s.canvas.encode(), again.get(id)?.canvas.encode() as Buffer), id).toBe(0);
  });
});
