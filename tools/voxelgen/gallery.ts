/** public/gallery.html: every sprite with its id and name, grouped by category, on light and dark backdrops. */
import { ASSET_LIST } from '../../src/shared/assets';
import type { AssetCategory } from '../../src/shared/assets';
import { PALETTE, PALETTE_KEYS } from './palette';
import type { Sprite } from './sheet';

const TITLES: Record<AssetCategory, string> = {
  hero: 'Heroes', enemy: 'Enemies', boss: 'Bosses', item: 'Items', sym: 'Dice symbols', fx: 'Face effects', kw: 'Keywords',
  status: 'Statuses', die: 'Dice and overlays', intent: 'Enemy intents', door: 'Doors', set: 'Set badges', ui: 'Interface icons',
  bg: 'Backgrounds', app: 'App icon',
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildGallery(all: Map<string, Sprite>): string {
  const groups = new Map<AssetCategory, string[]>();
  for (const a of ASSET_LIST) {
    const s = all.get(a.id);
    if (!s) continue;
    const w = s.canvas.w;
    const h = s.canvas.h;
    const big = Math.min(6, Math.max(2, Math.floor(300 / Math.max(w, h))));
    const img = (scale: number): string => `<img src="art/${a.id}.png" width="${w * scale}" height="${h * scale}" alt="${esc(a.name)}">`;
    const card = `<figure class="card"><div class="pair"><div class="pane light">${img(1)}${img(big)}</div><div class="pane dark">${img(1)}${img(big)}</div></div><figcaption><b>${esc(a.name)}</b><code>${a.id}</code><span>${w}x${h}</span></figcaption></figure>`;
    const list = groups.get(a.category) ?? [];
    list.push(card);
    groups.set(a.category, list);
  }
  const sections = (Object.keys(TITLES) as AssetCategory[])
    .filter((k) => groups.has(k))
    .map((k) => `<section id="${k}"><h2>${TITLES[k]} <small>${groups.get(k)?.length}</small></h2><div class="grid">${(groups.get(k) ?? []).join('')}</div></section>`)
    .join('\n');
  const nav = (Object.keys(TITLES) as AssetCategory[]).filter((k) => groups.has(k)).map((k) => `<a href="#${k}">${TITLES[k]}</a>`).join(' ');
  const swatches = PALETTE_KEYS.map((k) => `<i title="${k} ${PALETTE[k]}" style="background:${PALETTE[k]}"></i>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pip &amp; Blade art gallery</title>
<style>
  body { margin: 0; font: 14px/1.4 system-ui, sans-serif; background: #25223a; color: #f6f3ea; }
  header { padding: 16px; position: sticky; top: 0; background: #1b1730; z-index: 2; border-bottom: 2px solid #4b5169; }
  header h1 { margin: 0 0 6px; font-size: 18px; }
  header a { color: #8bd23f; margin-right: 10px; white-space: nowrap; }
  .sw { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 2px; }
  .sw i { width: 18px; height: 18px; display: block; border: 1px solid #0006; }
  section { padding: 8px 16px 24px; }
  h2 { margin: 16px 0 8px; } h2 small { color: #9099b0; font-weight: normal; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .card { margin: 0; background: #1b1730; border-radius: 8px; padding: 8px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .pane { display: flex; align-items: flex-end; justify-content: center; gap: 8px; padding: 8px; border-radius: 6px; min-height: 60px; overflow: hidden; }
  .light { background: #e8e4d6; } .dark { background: #2a2540; }
  img { image-rendering: pixelated; image-rendering: crisp-edges; image-rendering: pixelated; max-width: 100%; height: auto; }
  figcaption { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; margin-top: 6px; }
  figcaption code { color: #8bd23f; } figcaption span { color: #9099b0; margin-left: auto; }
</style>
</head>
<body>
<header><h1>Pip &amp; Blade art gallery</h1><div>${nav}</div><div class="sw">${swatches}</div></header>
${sections}
</body>
</html>
`;
}
