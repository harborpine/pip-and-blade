import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import type { ArtManifest } from '../../src/shared/assets';
import { APP_ICON_FILES, ASSET_LIST } from '../../src/shared/assets';
import { allowedColors, PALETTE_KEYS } from './palette';

const root = fileURLToPath(new URL('../..', import.meta.url));
const manifest = JSON.parse(readFileSync(`${root}src/art/generated/manifest.json`, 'utf8')) as ArtManifest;
const allowed = allowedColors();

function offPalette(file: string): number {
  const png = PNG.sync.read(readFileSync(file));
  let bad = 0;
  for (let i = 0; i < png.width * png.height; i++) {
    const a = png.data[i * 4 + 3] as number;
    if (a === 0) continue;
    const rgb = ((png.data[i * 4] as number) << 16) | ((png.data[i * 4 + 1] as number) << 8) | (png.data[i * 4 + 2] as number);
    if (a !== 255 || !allowed.has(rgb)) bad++;
  }
  return bad;
}

describe('voxelgen output', () => {
  it('palette is within the limit', () => {
    expect(PALETTE_KEYS.length).toBeLessThanOrEqual(28);
    expect(manifest.palette.length).toBe(PALETTE_KEYS.length);
  });
  it('every asset id is in the manifest with a PNG', () => {
    for (const a of ASSET_LIST) {
      const info = manifest.sprites[a.id];
      expect(info, a.id).toBeDefined();
      expect(existsSync(`${root}public/${info?.file}`), a.id).toBe(true);
    }
  });
  it('sprites use only palette-derived colours', () => {
    for (const a of ASSET_LIST) expect(offPalette(`${root}public/art/${a.id}.png`), a.id).toBe(0);
  });
  it('app icons exist, are square and opaque', () => {
    for (const f of APP_ICON_FILES) {
      const p = `${root}public/icons/${f}`;
      expect(existsSync(p), f).toBe(true);
      const png = PNG.sync.read(readFileSync(p));
      expect(png.width, f).toBe(png.height);
      for (let i = 0; i < png.width * png.height; i++) expect(png.data[i * 4 + 3]).toBe(255);
      expect(offPalette(p), f).toBe(0);
    }
  });
});
