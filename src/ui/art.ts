/**
 * The ONE place the UI reaches the art library. Every lookup is guarded: a missing sprite shows a placeholder box.
 *
 * Flat style (docs/flat-style.md): pictures are smooth vector drawings shown at any size. Each
 * helper looks at the file it is given: an `.svg` is shown the flat way (single-colour icons as a
 * CSS mask tinted by `color`, everything else as an <img>); an older `.png` is shown as a plain
 * picture so the game keeps working until art's full set lands. Swapping the art is a data change.
 */
import { ALL_SPRITE_IDS, hasSprite, sprite, spriteUrl } from '@art';
import type { SpriteInfo } from '@shared';
import { content } from './engine';

export { ALL_SPRITE_IDS, hasSprite };
export const spriteInfo = (id: string): SpriteInfo | null => (hasSprite(id) ? sprite(id) : null);
export const urlOf = (id: string): string | null => (hasSprite(id) ? spriteUrl(id) : null);
const isVector = (id: string): boolean => spriteInfo(id)?.file.endsWith('.svg') ?? false;

function missing(id: string, w: number, hgt: number, cls: string): HTMLElement {
  const ph = document.createElement('span');
  ph.className = `sprite sprite-missing ${cls}`.trim();
  ph.dataset['sprite'] = id;
  ph.style.width = `${w}px`;
  ph.style.height = `${hgt}px`;
  return ph;
}

function img(id: string, w: number, hgt: number, cls: string): HTMLElement {
  const url = urlOf(id);
  if (!url) return missing(id, w, hgt, cls);
  const el = document.createElement('img');
  el.className = `sprite ${cls}`.trim();
  el.src = url;
  el.alt = '';
  el.draggable = false;
  el.decoding = 'sync';
  el.dataset['sprite'] = id;
  el.style.width = `${w}px`;
  el.style.height = `${hgt}px`;
  return el;
}

/** An <img> of a sprite `w` CSS px wide (height from its proportions), or a placeholder box if missing. */
export function spriteImg(id: string, w: number, cls = ''): HTMLElement {
  const info = spriteInfo(id);
  const ratio = info ? info.h / info.w : 1;
  return img(id, w, Math.round(w * ratio), cls);
}

/** Categories whose icons are one colour: drawn as a mask, so CSS `color` tints them. */
const TINTED = /^(sym|fx|kw|status|intent|set|ui|die)\./;
const UNTINTED = new Set(['ui.logo', 'ui.rotate']);

/** A square icon `px` CSS px wide. Single-colour vector icons take the colour of the text around them (or their own, see styles.css). */
export function icon(id: string, px: number, cls = ''): HTMLElement {
  const url = inlined.get(id) ?? urlOf(id);
  if (url && isVector(id) && TINTED.test(id) && !UNTINTED.has(id)) {
    const el = document.createElement('span');
    el.className = `sprite icon tint ${cls}`.trim();
    el.dataset['sprite'] = id;
    el.setAttribute('aria-hidden', 'true');
    el.style.width = `${px}px`;
    el.style.height = `${px}px`;
    el.style.setProperty('--mask', `url("${url}")`);
    return el;
  }
  const info = spriteInfo(id);
  const ratio = info ? info.h / info.w : 1;
  return img(id, px, Math.round(px * ratio), `icon ${cls}`.trim());
}

/** A picture of an item or door: `big` on cards and the item sheet, small in list rows. */
export function picture(id: string, big = true): HTMLElement {
  const px = big ? 64 : 40;
  if (isVector(id) || !urlOf(id)) return img(id, px, px, 'picture');
  // A pixel picture: shown whole, scaled to fit the same square.
  return img(id, px, px, 'picture fit');
}

export type TokenKind = 'hero' | 'enemy' | 'elite' | 'boss';

/** Which coin a character is drawn on. */
export function tokenKind(spriteId: string): TokenKind {
  if (spriteId.startsWith('hero.')) return 'hero';
  if (spriteId.startsWith('boss.')) return 'boss';
  const def = content.enemies.find((e) => `enemy.${e.id}` === spriteId);
  return def?.kind === 'elite' ? 'elite' : 'enemy';
}

/**
 * A character as a round token `px` CSS px across: every hero, enemy and boss on every screen goes
 * through here. A vector token is the coin itself (<img>); an older miniature stands on a CSS coin.
 */
export function token(spriteId: string, px: number, cls = ''): HTMLElement {
  const kind = tokenKind(spriteId);
  const hero = spriteId.startsWith('hero.') ? spriteId.slice(5) : '';
  if (isVector(spriteId)) {
    const el = img(spriteId, px, px, `token token-${kind} ${cls}`.trim());
    if (hero) el.style.setProperty('--hc', `var(--hero-${hero})`);
    return el;
  }
  const disc = document.createElement('span');
  disc.className = `sprite token token-${kind} token-disc ${cls}`.trim();
  disc.dataset['sprite'] = spriteId;
  disc.style.width = `${px}px`;
  disc.style.height = `${px}px`;
  if (hero) disc.style.setProperty('--hc', `var(--hero-${hero})`);
  const pic = img(spriteId, px, px, 'token-pic');
  pic.style.width = '80%';
  pic.style.height = '80%';
  disc.append(pic);
  return disc;
}

/** Single-colour icons as data: addresses, so a mask is painted at once (a mask named by address is fetched lazily, and drawn blank until then). */
const inlined = new Map<string, string>();

/**
 * Fetch every single-colour icon once and keep it in the page as a data: address. Resolves when done
 * (or after `maxMs`, whichever is first); icons not yet inlined fall back to their address.
 */
export function inlineIcons(maxMs = 2500): Promise<void> {
  const ids = ALL_SPRITE_IDS.filter((id) => TINTED.test(id) && !UNTINTED.has(id) && isVector(id));
  const queue = [...ids];
  // A few at a time: gentle on a phone (and on a small local server).
  const worker = async (): Promise<void> => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      const url = urlOf(id);
      if (!url) continue;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const text = await res.text();
        inlined.set(id, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`);
      } catch {
        /* offline before the first load: the address is used as it is */
      }
    }
  };
  const all = Promise.all(Array.from({ length: 6 }, worker)).then(() => undefined);
  return Promise.race([all, new Promise<void>((resolve) => setTimeout(resolve, maxMs))]);
}

/** Load and decode a set of sprites now, so the first screen that uses them is never drawn without them. */
export function preload(ids: readonly string[]): Promise<void> {
  const jobs = ids.map((id) => {
    const url = urlOf(id);
    if (!url) return Promise.resolve();
    const im = new Image();
    im.src = url;
    kept.push(im);
    return typeof im.decode === 'function' ? im.decode().catch(() => undefined) : new Promise<void>((r) => { im.onload = im.onerror = () => r(); });
  });
  return Promise.all(jobs).then(() => undefined);
}
const kept: HTMLImageElement[] = [];

/** The backdrops, as CSS variables (--bg-act1 ...). Backdrops are pictures, not interface surfaces. */
export function installBackdrops(): void {
  const lines = ALL_SPRITE_IDS.filter((id) => id.startsWith('bg.')).map((id) => `--bg-${id.slice(3)}: url("${urlOf(id) ?? ''}");`);
  const style = document.createElement('style');
  style.id = 'backdrops';
  style.textContent = `:root {\n${lines.join('\n')}\n}`;
  document.head.append(style);
}
