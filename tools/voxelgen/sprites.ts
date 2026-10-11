/** Builds every sprite: everything on the asset list plus the generator's own kit, font and die-face pieces. */
import { ASSET_LIST } from '../../src/shared/assets';

import { buildLogo, drawAppIcon } from './appicon';
import { buildCharacters } from './characters';

import { HERO_DIE_COLOR } from './heroes';
import { effects, intents, keywords, setBadges, statuses, symbols, uiIcons } from './icons';
import { buildToyDoors, buildToyItems } from './toyitems';
import { buildKit } from './kit';
import { buildScenes } from './scenes';
import type { Sprite } from './sheet';
import { buildToyDice } from './toydice';

export function buildAll(): Map<string, Sprite> {
  const all = new Map<string, Sprite>();
  const put = (cat: string, group: Record<string, Sprite>): void => {
    for (const [k, v] of Object.entries(group)) all.set(`${cat}.${k}`, v);
  };
  for (const [id, s] of buildCharacters()) all.set(id, s);
  for (const [id, s] of buildToyItems()) all.set(id, s);
  put('sym', symbols());
  put('fx', effects());
  put('kw', keywords());
  put('status', statuses());
  put('set', setBadges());
  put('intent', intents());
  put('ui', uiIcons());
  for (const [id, s] of buildToyDice(HERO_DIE_COLOR)) all.set(id, s);
  for (const [id, s] of buildToyDoors()) all.set(id, s);
  for (const [id, s] of buildScenes()) all.set(id, s);
  for (const [id, s] of buildKit()) all.set(id, s);
  all.set('ui.logo', buildLogo());
  const icon = drawAppIcon(64, 8);
  // the die and sword are voxel renders; the field behind them is a flat fill so the icon is opaque
  all.set('app.icon', { canvas: icon, ax: 32, ay: 32, render: 'voxel' });
  return all;
}

/** Ids on the asset list that have no sprite yet. */
export function missingIds(all: Map<string, Sprite>): string[] {
  return ASSET_LIST.map((a) => a.id).filter((id) => !all.has(id));
}
