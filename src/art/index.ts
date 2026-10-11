/**
 * Runtime access to the generated art (see tools/voxelgen; everything here is written by `npm run art`).
 *
 *   import { sprite, spriteUrl, hasSprite, ALL_SPRITE_IDS, FONT, LAYOUT, PAL } from '@art';
 *   const info = sprite('hero.bulwark');        // { file, w, h, ax, ay, render?, slice? }
 *   img.src = spriteUrl('hero.bulwark');         // BASE_URL + 'art/hero.bulwark.png'
 *
 * The palette is also available as CSS variables: src/art/generated/palette.css defines
 * --pal-NAME, --pal-NAME-light and --pal-NAME-dark for each of the 24 colours.
 */
import type { SpriteInfo } from '@shared';
import fontJson from './generated/font.json';
import layoutJson from './generated/layout.json';
import manifestJson from './generated/manifest.json';
import paletteJson from './generated/palette.json';

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

/** URL of the sprite's PNG, correct under the /pip-and-blade/ base path. */
export function spriteUrl(id: string): string {
  return import.meta.env.BASE_URL + sprite(id).file;
}

export function hasSprite(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(manifest.sprites, id);
}

export const ALL_SPRITE_IDS: readonly string[] = Object.keys(manifest.sprites);

/** The shared palette (hex strings, base shade only). */
export const PALETTE: readonly string[] = manifest.palette;

/** One colour of the palette in its three shades. */
export interface PaletteShades { light: string; base: string; dark: string }
/** The shared palette by name ("ink", "cream", "gold", ...), each in three shades. */
export const PAL: Readonly<Record<string, PaletteShades>> = paletteJson;

/** One glyph of a bitmap font: its box in the atlas and how far to move on, all in native pixels. */
export interface FontGlyph { x: number; y: number; w: number; h: number; advance: number }
export interface BitmapFont {
  /** Atlas sprite ids by colour, e.g. { ink: 'kit.font', ivory: 'kit.font_ivory' }. Same metrics for each. */
  sprites: Record<string, string>;
  /** Glyph height in native pixels. */
  height: number;
  /** Advance for a space (and for any character the font does not have). */
  space: number;
  glyphs: Record<string, FontGlyph>;
}
/**
 * The pixel fonts. `small`: capitals, digits and punctuation, 7 px tall (show at 2 CSS px per pixel).
 * `big`: digits and + - / with an ink edge, 14 px tall, for dice values, HP and damage pops.
 * Upper-case text before lookup. The multiplication sign is U+00D7 and the arrow is U+2192.
 */
export const FONT: Readonly<{ small: BitmapFont; big: BitmapFont }> = fontJson;

interface Point { x: number; y: number }
/** Layout numbers that go with the art, in native pixels. */
export const LAYOUT: Readonly<{
  /** CSS px per native pixel for kit pieces, dice and characters. */
  kitScale: number;
  /** Native size of a standard icon (show at 18, 24, 36 or 48 CSS px). */
  icon: number;
  /** The shared die canvas: size, where the die stands (the sprite anchor), and the centres of the left plate (effect), right plate (number) and top. */
  die: { w: number; h: number; foot: Point; left: Point; right: Point; top: Point };
}> = layoutJson;
