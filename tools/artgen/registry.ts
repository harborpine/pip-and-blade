/** Which generator draws which asset id, and at what viewBox size. */
import { APP_SIZE, appIconSvg, LOGO_H, LOGO_W, logoSvg } from './appicon';
import { BACKGROUNDS, backgroundSvg, BG_H, BG_W } from './backgrounds';
import { ICON_SIZE, ICONS, iconSvg } from './icons';
import { DOORS, ITEM_SIZE, ITEMS, itemSvg } from './items';
import { TOKEN_SIZE, TOKENS, tokenSvg } from './tokens';

export interface DrawnAsset { svg: string; w: number; h: number }

export function drawAsset(id: string): DrawnAsset | null {
  if (ICONS[id] !== undefined) return { svg: iconSvg(id), w: ICON_SIZE, h: ICON_SIZE };
  if (TOKENS[id]) return { svg: tokenSvg(id), w: TOKEN_SIZE, h: TOKEN_SIZE };
  if (ITEMS[id] || DOORS[id]) return { svg: itemSvg(id), w: ITEM_SIZE, h: ITEM_SIZE };
  if (BACKGROUNDS[id]) return { svg: backgroundSvg(id), w: BG_W, h: BG_H };
  if (id === 'app.icon') return { svg: appIconSvg(), w: APP_SIZE, h: APP_SIZE };
  if (id === 'ui.logo') return { svg: logoSvg(), w: LOGO_W, h: LOGO_H };
  return null;
}
