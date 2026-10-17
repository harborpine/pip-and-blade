import { describe, expect, it } from 'vitest';
import { backgroundSvg, BACKGROUNDS } from './backgrounds';
import { ICONS, iconSvg } from './icons';
import { DOORS, ITEMS, itemSvg } from './items';
import { mockFightSvg } from './mock';
import { BASE, HERO_COLOR, PALETTE, contrast } from './palette';
import { colorsIn } from './svg';
import { TOKENS, tokenSvg } from './tokens';

const allowed = new Set(Object.values(PALETTE).map((h) => h.toLowerCase()));
const every = (): [string, string][] => [
  ...Object.keys(ICONS).map((id) => [id, iconSvg(id)] as [string, string]),
  ...Object.keys(TOKENS).map((id) => [id, tokenSvg(id)] as [string, string]),
  ...[...Object.keys(ITEMS), ...Object.keys(DOORS)].map((id) => [id, itemSvg(id)] as [string, string]),
  ...Object.keys(BACKGROUNDS).map((id) => [id, backgroundSvg(id)] as [string, string]),
  ['mock', mockFightSvg()],
];

describe('artgen palette', () => {
  it('has the spec base colours, 8 hero colours, at most 28 in all', () => {
    expect(Object.keys(BASE)).toHaveLength(15);
    expect(Object.keys(HERO_COLOR)).toHaveLength(8);
    expect(Object.keys(PALETTE).length).toBeLessThanOrEqual(28);
    expect(new Set(Object.values(PALETTE)).size).toBe(Object.keys(PALETTE).length);
  });
  it('every hero colour is at least 3:1 against ivory', () => {
    for (const hex of Object.values(HERO_COLOR)) expect(contrast(hex, BASE.ivory)).toBeGreaterThanOrEqual(3);
  });
});

describe('artgen drawings', () => {
  it('use only palette colours', () => {
    for (const [id, svg] of every()) {
      for (const col of colorsIn(svg)) expect(allowed.has(col), `${id} uses ${col}`).toBe(true);
    }
  });
  it('icons are single-colour (currentColor only) on a 24 grid', () => {
    for (const id of Object.keys(ICONS)) {
      const svg = iconSvg(id);
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(colorsIn(svg)).toEqual([]);
    }
  });
  it('items and doors are 48x48 and use at most 3 palette colours, no currentColor', () => {
    for (const id of [...Object.keys(ITEMS), ...Object.keys(DOORS)]) {
      const svg = itemSvg(id);
      expect(svg).toContain('viewBox="0 0 48 48"');
      expect(svg).not.toContain('currentColor');
      expect(colorsIn(svg).length, id).toBeLessThanOrEqual(3);
    }
  });
  it('tokens are 96x96', () => {
    for (const id of Object.keys(TOKENS)) expect(tokenSvg(id)).toContain('viewBox="0 0 96 96"');
  });
  it('are deterministic', () => {
    expect(every()).toEqual(every());
  });
});
