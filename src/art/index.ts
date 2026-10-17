/**
 * Runtime access to the generated art (tools/artgen; everything here is written by `npm run art`).
 * Every picture is a flat SVG (docs/flat-style.md).
 *
 *   import { sprite, spriteUrl, hasSprite, ALL_SPRITE_IDS, PALETTE, HERO_COLOR } from '@art';
 *   const info = sprite('hero.bulwark');        // { file, w, h, ax, ay, render }
 *   img.src = spriteUrl('hero.bulwark');         // BASE_URL + 'art/hero.bulwark.svg'
 *
 * The palette is also available as CSS variables: src/art/generated/palette.css defines
 * --c-NAME for each palette colour and --hero-ID for each hero colour.
 */
import type { SpriteInfo } from '@shared';
import colorsJson from './generated/colors.json';
import manifestJson from './generated/manifest.json';

interface Manifest {
  generatedBy: string;
  palette: string[];
  sprites: Record<string, SpriteInfo>;
}

const manifest = manifestJson as unknown as Manifest;

/** Sprite metadata for an asset id such as "hero.bulwark". Throws on an unknown id. */
export function sprite(id: string): SpriteInfo {
  const info = manifest.sprites[id];
  if (!info) throw new Error(`Unknown sprite id: "${id}"`);
  return info;
}

/** URL of the sprite's SVG, correct under the /pip-and-blade/ base path. */
export function spriteUrl(id: string): string {
  return import.meta.env.BASE_URL + sprite(id).file;
}

export function hasSprite(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(manifest.sprites, id);
}

export const ALL_SPRITE_IDS: readonly string[] = Object.keys(manifest.sprites);

/** The 0.3.0 flat palette by name ("ink", "ivory", "gold", "hero-bulwark", ...) as hex (docs/flat-style.md section 2). */
export const PALETTE: Readonly<Record<string, string>> = colorsJson.palette;
/** One colour per hero, by hero id. Also CSS variables --hero-<id> in src/art/generated/palette.css. */
export const HERO_COLOR: Readonly<Record<string, string>> = colorsJson.hero;
