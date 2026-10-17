/**
 * The flat look (0.3.0), checked on the files the game ships. Replaces voxelgen's
 * "every icon is a voxel toy" checks (docs/flat-style.md sections 9 and 10).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { APP_ICON_FILES, ASSET_LIST } from '../../src/shared/assets';
import type { ArtManifest } from '../../src/shared/assets';
import { flatAssetIds } from './build';
import { PALETTE } from './palette';
import { drawAsset } from './registry';
import { colorsIn } from './svg';

const root = fileURLToPath(new URL('../..', import.meta.url));
const manifest = JSON.parse(readFileSync(`${root}src/art/generated/manifest.json`, 'utf8')) as ArtManifest;
const allowed = new Set(Object.values(PALETTE).map((h) => h.toLowerCase()));
const size = (cat: string): [number, number] | null =>
  cat === 'hero' || cat === 'enemy' || cat === 'boss' ? [96, 96] : cat === 'item' || cat === 'door' ? [48, 48] : cat === 'bg' ? [390, 844] : cat === 'app' ? [512, 512] : null;

describe('flat art on disk', () => {
  it('the asset list is exactly what the generator builds', () => {
    expect(ASSET_LIST.map((a) => a.id).sort()).toEqual(flatAssetIds().sort());
  });
  it('every asset is an SVG in public/art with render "flat" and its viewBox size', () => {
    for (const a of ASSET_LIST) {
      const info = manifest.sprites[a.id];
      expect(info, a.id).toBeDefined();
      expect(info!.render, a.id).toBe('flat');
      expect(info!.file, a.id).toBe(`art/${a.id}.svg`);
      const svg = readFileSync(`${root}public/${info!.file}`, 'utf8');
      expect(svg, a.id).toContain(`viewBox="0 0 ${info!.w} ${info!.h}"`);
      const want = size(a.category) ?? (a.id === 'ui.logo' ? [160, 120] : [24, 24]);
      expect([info!.w, info!.h], a.id).toEqual(want);
    }
  });
  it('only palette colours are used', () => {
    for (const a of ASSET_LIST) {
      const svg = readFileSync(`${root}public/art/${a.id}.svg`, 'utf8');
      for (const col of colorsIn(svg)) expect(allowed.has(col), `${a.id} uses ${col}`).toBe(true);
    }
    expect(Object.keys(PALETTE).length).toBeLessThanOrEqual(28);
  });
  it('the files on disk are what the generator makes now (deterministic, nothing stale)', () => {
    for (const a of ASSET_LIST) expect(readFileSync(`${root}public/art/${a.id}.svg`, 'utf8'), a.id).toBe(drawAsset(a.id)!.svg);
  });
  it('no pixel picture is left in public/art', () => {
    const files = readdirSync(`${root}public/art`);
    expect(files.filter((f) => !f.endsWith('.svg'))).toEqual([]);
    expect(files.length).toBe(ASSET_LIST.length);
  });
  it('the five app icons exist, are square and opaque', () => {
    for (const f of APP_ICON_FILES) {
      const p = `${root}public/icons/${f}`;
      expect(existsSync(p), f).toBe(true);
      const png = PNG.sync.read(readFileSync(p));
      expect(png.width, f).toBe(png.height);
      for (let i = 0; i < png.width * png.height; i++) expect(png.data[i * 4 + 3]).toBe(255);
    }
  });
});
