/**
 * Runtime access to the generated sprites (see tools/voxelgen).
 *
 *   import { sprite, spriteUrl, hasSprite, ALL_SPRITE_IDS } from '@art';
 *   const info = sprite('hero.bulwark');        // { file, w, h, ax, ay }
 *   img.src = spriteUrl('hero.bulwark');         // BASE_URL + 'art/hero.bulwark.png'
 */
import type { SpriteInfo } from '@shared';
import manifestJson from './generated/manifest.json';

interface Manifest {
  generatedBy: string;
  palette: string[];
  sprites: Record<string, SpriteInfo>;
}

const manifest = manifestJson as Manifest;

/** Sprite metadata for an asset id such as "hero.bulwark". Throws on an unknown id. */
export function sprite(id: string): SpriteInfo {
  const info = manifest.sprites[id];
  if (!info) throw new Error(`Unknown sprite id: "${id}"`);
  return info;
}

/** URL of the sprite's PNG, correct under the /pip-and-blade/ base path. */
export function spriteUrl(id: string): string {
  return import.meta.env.BASE_URL + sprite(id).file;
}

export function hasSprite(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(manifest.sprites, id);
}

export const ALL_SPRITE_IDS: readonly string[] = Object.keys(manifest.sprites);

/** The shared palette (hex strings). */
export const PALETTE: readonly string[] = manifest.palette;
