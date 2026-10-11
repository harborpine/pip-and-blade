/** Builds every sprite on the asset list. */
import { ASSET_LIST } from '../../src/shared/assets';
import { HERO_ROSTER } from '../../src/shared/roster';
import { buildBackgrounds } from './backgrounds';
import { buildLogo, drawAppIcon } from './appicon';
import { buildCharacters } from './characters';
import { buildDice } from './dice';
import { buildDoors } from './doors';
import { effects, keywords, setBadges, statuses, symbols } from './icons1';
import { intents, uiIcons } from './icons2';
import { buildItems } from './items';
import type { Sprite } from './sheet';

export function buildAll(): Map<string, Sprite> {
  const all = new Map<string, Sprite>();
  const put = (cat: string, group: Record<string, Sprite>): void => {
    for (const [k, v] of Object.entries(group)) all.set(`${cat}.${k}`, v);
  };
  for (const [id, s] of buildCharacters()) all.set(id, s);
  for (const [id, s] of buildItems()) all.set(id, s);
  put('sym', symbols());
  put('fx', effects());
  put('kw', keywords());
  put('status', statuses());
  put('set', setBadges());
  put('intent', intents());
  put('ui', uiIcons());
  for (const [id, s] of buildDice(HERO_ROSTER.map((h) => h.id))) all.set(id, s);
  for (const [id, s] of buildDoors()) all.set(id, s);
  for (const [id, s] of buildBackgrounds()) all.set(id, s);
  all.set('ui.logo', buildLogo());
  const icon = drawAppIcon(64, 8);
  all.set('app.icon', { canvas: icon, ax: 32, ay: 32 });
  return all;
}

/** Ids on the asset list that have no sprite yet. */
export function missingIds(all: Map<string, Sprite>): string[] {
  return ASSET_LIST.map((a) => a.id).filter((id) => !all.has(id));
}
