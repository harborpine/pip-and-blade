/**
 * The app icon (an ivory die with a red sword on a slate field) and the title logo
 * (an ivory die and a short sword). docs/flat-style.md sections 5 and 8.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { placeIcon } from './icons';
import { c } from './palette';
import { rasterise } from './raster';
import { circle, g, path, rect, roundPoly, svgDoc } from './svg';

export const APP_SIZE = 512;
export const LOGO_W = 160;
export const LOGO_H = 120;

/** The icon: slate field, ivory die of `die` px with a red rim, the red sword icon on it. */
export function appIconSvg(die = 330): string {
  const x = (APP_SIZE - die) / 2;
  const rim = die * 0.065;
  const icon = die * 0.72;
  return svgDoc(APP_SIZE, APP_SIZE,
    rect(0, 0, APP_SIZE, APP_SIZE, 0, { fill: c('slate') }) +
    rect(x, x, die, die, die * 0.22, { fill: c('red') }) +
    rect(x + rim, x + rim, die - 2 * rim, die - 2 * rim, die * 0.22 - rim, { fill: c('ivory') }) +
    placeIcon('fx.damage', (APP_SIZE - icon) / 2, (APP_SIZE - icon) / 2, icon, c('red')));
}

export function logoSvg(): string {
  const body =
    // a front-on die with three pips (not tilted: the owner asked for front-on dice)
    g({},
      rect(16, 24, 80, 80, 18, { fill: c('red') }) + rect(21, 29, 70, 70, 14, { fill: c('ivory') }) +
      circle(38, 46, 7, { fill: c('ink') }) + circle(56, 64, 7, { fill: c('ink') }) + circle(74, 82, 7, { fill: c('ink') })) +
    // short sword rising behind the right side, pointing up-right
    g({ transform: 'rotate(35 118 70)' },
      path(roundPoly([[111, 82], [111, 28], [118, 14], [125, 28], [125, 82]], [1, 3, 2, 3, 1]), { fill: c('stone') }) +
      rect(98, 80, 40, 10, 5, { fill: c('gold') }) +
      rect(113, 90, 10, 16, 2, { fill: c('brown') }) +
      circle(118, 110, 7, { fill: c('gold') }));
  return svgDoc(LOGO_W, LOGO_H, body);
}

/** Rasterise the five PWA icons (APP_ICON_FILES) into public/icons with Playwright's Chromium. */
export async function writeAppIcons(root: string): Promise<string[]> {
  const iconDir = join(root, 'public', 'icons');
  mkdirSync(iconDir, { recursive: true });
  const tmp = join(tmpdir(), `artgen-icons-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  const normal = join(tmp, 'icon.svg');
  const maskable = join(tmp, 'maskable.svg');
  const favicon = join(tmp, 'favicon.svg');
  writeFileSync(normal, appIconSvg(330));
  writeFileSync(maskable, appIconSvg(270)); // inside the 80% safe circle
  writeFileSync(favicon, appIconSvg(440)); // fill the tiny tab icon
  const out: [string, string, number][] = [
    ['icon-192.png', normal, 192],
    ['icon-512.png', normal, 512],
    ['icon-maskable-512.png', maskable, 512],
    ['apple-touch-icon.png', normal, 180],
    ['favicon-32.png', favicon, 32],
  ];
  await rasterise(out.map(([name, svg, px]) => ({ svg, png: join(iconDir, name), w: APP_SIZE, h: APP_SIZE, scale: px / APP_SIZE })));
  rmSync(tmp, { recursive: true, force: true });
  return out.map(([n]) => n);
}
