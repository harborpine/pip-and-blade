/**
 * `npm run art`: regenerate every graphic, deterministically, offline.
 *   public/art/<assetId>.png, public/icons/*, public/gallery.html, src/art/generated/manifest.json
 * Review helper: `npm run art -- --sheet <idPrefix> <out.png> [scale] [cols] [bg]` writes a contact sheet only.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ArtManifest, SpriteInfo } from '../../src/shared/assets';
import { ASSET_LIST } from '../../src/shared/assets';
import { drawAppIcon } from './appicon';
import type { Canvas } from './canvas';
import { buildGallery } from './gallery';
import { PALETTE_KEYS, PALETTE } from './palette';
import { writeSheet } from './preview';
import { buildAll, missingIds } from './sprites';

const root = fileURLToPath(new URL('../..', import.meta.url));

function resizeNearest(src: Canvas, size: number): Canvas {
  const out = new (src.constructor as new (w: number, h: number) => Canvas)(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) out.px[y * size + x] = src.get(Math.floor((x * src.w) / size), Math.floor((y * src.h) / size));
  return out;
}

function main(): void {
  const args = process.argv.slice(2);
  const all = buildAll();

  if (args[0] === '--sheet') {
    const [, prefix = '', out = 'sheet.png', scale = '3', cols = '6', bg = 'g'] = args;
    writeSheet(all, prefix, out, Number(scale), Number(cols), bg);
    console.log(`wrote ${out}`);
    return;
  }

  const artDir = `${root}public/art`;
  const iconDir = `${root}public/icons`;
  mkdirSync(artDir, { recursive: true });
  mkdirSync(iconDir, { recursive: true });
  mkdirSync(`${root}src/art/generated`, { recursive: true });
  // remove stale sprites so the folder always matches the asset list
  const wanted = new Set(ASSET_LIST.map((a) => `${a.id}.png`));
  for (const f of readdirSync(artDir)) if (f.endsWith('.png') && !wanted.has(f)) rmSync(`${artDir}/${f}`);

  const sprites: Record<string, SpriteInfo> = {};
  for (const id of [...all.keys()].sort()) {
    const s = all.get(id);
    if (!s) continue;
    writeFileSync(`${artDir}/${id}.png`, s.canvas.encode());
    sprites[id] = { file: `art/${id}.png`, w: s.canvas.w, h: s.canvas.h, ax: Math.round(s.ax), ay: Math.round(s.ay) };
  }
  const manifest: ArtManifest = { generatedBy: 'voxelgen', palette: PALETTE_KEYS.map((k) => PALETTE[k] as string), sprites };
  writeFileSync(`${root}src/art/generated/manifest.json`, `${JSON.stringify(manifest, null, 1)}\n`);

  // app icons
  const big = drawAppIcon(64, 8);
  writeFileSync(`${iconDir}/icon-192.png`, resizeNearest(big, 192).encode());
  writeFileSync(`${iconDir}/icon-512.png`, resizeNearest(big, 512).encode());
  writeFileSync(`${iconDir}/icon-maskable-512.png`, resizeNearest(drawAppIcon(64, 6), 512).encode());
  writeFileSync(`${iconDir}/apple-touch-icon.png`, resizeNearest(big, 180).encode());
  writeFileSync(`${iconDir}/favicon-32.png`, drawAppIcon(32, 5).encode());

  writeFileSync(`${root}public/gallery.html`, buildGallery(all));

  const missing = missingIds(all);
  const counts = new Map<string, number>();
  for (const id of all.keys()) counts.set(id.split('.')[0] as string, (counts.get(id.split('.')[0] as string) ?? 0) + 1);
  console.log(`voxelgen: ${all.size} sprites written, palette ${PALETTE_KEYS.length} colours`);
  console.log([...counts.entries()].map(([k, v]) => `${k}=${v}`).join(' '));
  if (missing.length > 0) {
    console.error(`MISSING ${missing.length} asset ids: ${missing.join(', ')}`);
    if (!args.includes('--allow-missing')) process.exitCode = 1;
  }
}

main();
