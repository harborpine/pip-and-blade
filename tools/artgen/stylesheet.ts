/** The 0.3.0 style sheet: review pictures written to tools/artgen/stylesheet/ only. */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { flatAssetIds } from './build';
import { backgroundSvg, BG_H, BG_W } from './backgrounds';
import { ICONS, iconSvg, placeIcon } from './icons';
import { FONT, mockFightSvg } from './mock';
import { HERO_COLOR, PALETTE, c, contrast } from './palette';
import { rasterise, rasteriseHtml } from './raster';
import type { RasterJob } from './raster';
import { el, rect, svgDoc } from './svg';
import { TOKENS, placeToken, tokenSvg } from './tokens';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const label = (x: number, y: number, s: string, color: string, size = 12, anchor = 'start'): string =>
  el('text', { x, y, 'font-size': size, 'font-weight': 700, fill: color, 'font-family': FONT, 'text-anchor': anchor }, s);

function paletteSheet(): { svg: string; w: number; h: number } {
  const entries = Object.entries(PALETTE);
  const cols = 4;
  const cw = 190;
  const ch = 64;
  const w = cols * cw + 20;
  const h = Math.ceil(entries.length / cols) * ch + 50;
  let b = rect(0, 0, w, h, 0, { fill: c('paper') }) + label(10, 26, `Palette: ${entries.length} colours (max 28)`, c('ink'), 16);
  entries.forEach(([name, hex], i) => {
    const x = 10 + (i % cols) * cw;
    const y = 40 + Math.floor(i / cols) * ch;
    b += rect(x, y, 48, 48, 10, { fill: hex, stroke: c('ivory-dim'), 'stroke-width': 1 });
    b += label(x + 56, y + 20, name, c('ink'), 13);
    const extra = name.startsWith('hero-') ? `  ${contrast(hex, c('ivory')).toFixed(1)}:1 on ivory` : '';
    b += label(x + 56, y + 38, `${hex}${extra}`, c('ink-soft'), 11);
  });
  return { svg: svgDoc(w, h, b), w, h };
}

function iconSheet(ids: readonly string[], title: string): { svg: string; w: number; h: number } {
  const cols = 5;
  const cw = 186;
  const ch = 80;
  const w = cols * cw + 20;
  const h = Math.ceil(ids.length / cols) * ch + 50;
  const heroes = Object.values(HERO_COLOR);
  let b = rect(0, 0, w, h, 0, { fill: c('paper') }) + label(10, 26, title, c('ink'), 16);
  ids.forEach((id, i) => {
    const x = 10 + (i % cols) * cw;
    const y = 40 + Math.floor(i / cols) * ch;
    b += rect(x, y, 24, 24, 6, { fill: c('ivory') }) + placeIcon(id, x + 4, y + 4, 16, c('ink'));
    b += rect(x + 28, y, 28, 28, 6, { fill: c('slate') }) + placeIcon(id, x + 32, y + 4, 20, c('ivory'));
    b += rect(x + 60, y, 42, 42, 8, { fill: c('ivory') }) + placeIcon(id, x + 64, y + 4, 34, heroes[i % heroes.length]!);
    b += placeIcon(id, x + 108, y - 3, 48, c('ink'));
    b += label(x, y + 58, id, c('ink-soft'), 11);
  });
  return { svg: svgDoc(w, h, b), w, h };
}

function tokenSheet(): { svg: string; w: number; h: number } {
  const ids = Object.keys(TOKENS);
  const w = 120 * ids.length + 20;
  const h = 470;
  let b = rect(0, 0, w, h, 0, { fill: c('paper') }) + rect(0, 210, w, 260, 0, { fill: c('slate') });
  b += label(10, 24, 'Tokens at 96px and 64px', c('ink'), 16);
  ids.forEach((id, i) => {
    const x = 10 + i * 120;
    b += placeToken(id, x + 12, 34, 96);
    b += placeToken(id, x + 28, 136, 64);
    b += label(x + 60, 222, id.split('.')[1]!, c('ivory'), 11, 'middle');
  });
  b += label(10, 256, 'Act 1 enemies side by side at 64px, boss at 1.5x', c('ivory'), 14);
  const act1 = ['enemy.gnaw_rat', 'enemy.mud_slime', 'enemy.hollow_stag'];
  act1.forEach((id, i) => { b += placeToken(id, 20 + i * 80, 300, 64); });
  b += placeToken('boss.bramble_king', 270, 284, 96);
  b += label(10, 420, 'Heroes at 64px', c('ivory'), 14);
  ['hero.bulwark', 'hero.duelist', 'hero.herbalist'].forEach((id, i) => { b += placeToken(id, 400 + i * 80, 300, 64); });
  return { svg: svgDoc(w, h, b), w, h };
}

export async function writeStyleSheet(outDir: string): Promise<string[]> {
  mkdirSync(join(outDir, 'svg'), { recursive: true });
  const written: string[] = [];
  const put = (name: string, svg: string): string => {
    const p = join(outDir, name);
    writeFileSync(p, svg);
    written.push(p);
    return p;
  };
  for (const id of Object.keys(ICONS)) put(`svg/${id}.svg`, iconSvg(id));
  for (const id of Object.keys(TOKENS)) put(`svg/${id}.svg`, tokenSvg(id));
  put('svg/bg.act1.svg', backgroundSvg('bg.act1'));

  const jobs: RasterJob[] = [];
  const sheet = (name: string, s: { svg: string; w: number; h: number }, scale: number): void => {
    const svg = put(`${name}.svg`, s.svg);
    const png = join(outDir, scale === 3 ? `${name}@3x.png` : `${name}.png`);
    jobs.push({ svg, png, w: s.w, h: s.h, scale });
    written.push(png);
  };
  sheet('palette', paletteSheet(), 1);
  sheet('icons', iconSheet(Object.keys(ICONS), 'Icons: 16px ink on ivory, 20px on slate, 34px hero colour on ivory (die size), 48px'), 2);
  sheet('tokens', tokenSheet(), 2);
  sheet('mock-fight', { svg: mockFightSvg(), w: BG_W, h: BG_H }, 3);
  await rasterise(jobs);
  return written;
}

/**
 * A contact sheet of every built asset whose id starts with `prefix` (reads public/art via the
 * staged or real manifest), at 64px on slate and on paper, labelled. For reviewing at phone size.
 */
export async function writeContactSheet(prefix: string, out: string, px = 64): Promise<void> {
  const ids = flatAssetIds().filter((id) => id.startsWith(prefix) && existsSync(join(ROOT, 'public', 'art', `${id}.svg`)));
  const cell = (id: string, bg: string, fg: string): string =>
    `<div style="background:${bg};color:${fg};padding:6px;text-align:center;width:${px + 40}px"><img src="${pathToFileURL(join(ROOT, 'public', 'art', `${id}.svg`)).href}" style="width:${px}px;height:auto;display:block;margin:0 auto"><div style="font:600 11px system-ui;margin-top:4px;overflow:hidden;white-space:nowrap">${id.split('.').slice(1).join('.')}</div></div>`;
  const row = (bg: string, fg: string): string => `<div style="display:flex;flex-wrap:wrap;gap:0">${ids.map((id) => cell(id, bg, fg)).join('')}</div>`;
  const html = `<!doctype html><html><body style="margin:0;background:${c('paper')}">${row(c('slate'), c('ivory'))}${row(c('paper'), c('ink'))}</body></html>`;
  const tmp = `${out}.html`;
  writeFileSync(tmp, html);
  await rasteriseHtml(tmp, out, Math.min(1400, Math.max(400, ids.length * (px + 52))), 2);
  rmSync(tmp);
}

/** Heroes, each act's enemies and the bosses in rows at 64px on the play-area colour (bosses at 96). */
export async function writeTokenActs(out: string): Promise<void> {
  const ids = flatAssetIds().filter((id) => /^(hero|enemy|boss)\./.test(id));
  const rows: [string, string[]][] = [
    ['Heroes', ids.filter((id) => id.startsWith('hero.'))],
    ['Act 1', ids.filter((id) => id.startsWith('enemy.')).slice(0, 8)],
    ['Act 2', ids.filter((id) => id.startsWith('enemy.')).slice(8, 17)],
    ['Act 3', ids.filter((id) => id.startsWith('enemy.')).slice(17)],
    ['Bosses (1.5x)', ids.filter((id) => id.startsWith('boss.'))],
  ];
  const img = (id: string): string => {
    const px = id.startsWith('boss.') ? 96 : 64;
    return `<div style="width:${Math.max(px, 74)}px;text-align:center;color:${c('ivory-dim')};font:600 10px system-ui"><img src="${pathToFileURL(join(ROOT, 'public', 'art', `${id}.svg`)).href}" style="width:${px}px;height:${px}px;display:block;margin:0 auto 3px">${id.split('.')[1]}</div>`;
  };
  const html = `<!doctype html><html><body style="margin:0;padding:12px;background:${c('slate')}">${rows.map(([t, r]) => `<div style="color:${c('ivory')};font:800 14px system-ui;margin:10px 0 6px">${t}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${r.map(img).join('')}</div>`).join('')}</body></html>`;
  const tmp = `${out}.html`;
  writeFileSync(tmp, html);
  await rasteriseHtml(tmp, out, 760, 1.5);
  rmSync(tmp);
}
