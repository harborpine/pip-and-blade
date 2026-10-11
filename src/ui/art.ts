/** The ONE place the UI reaches the art library. Every lookup is guarded: a missing sprite shows a placeholder box. */
import { ALL_SPRITE_IDS, FONT, LAYOUT, PAL, hasSprite, sprite, spriteUrl } from '@art';
import type { BitmapFont } from '@art';
import type { SpriteInfo } from '@shared';

export { ALL_SPRITE_IDS, FONT, LAYOUT, PAL, hasSprite };
export const spriteInfo = (id: string): SpriteInfo | null => (hasSprite(id) ? sprite(id) : null);
export const urlOf = (id: string): string | null => (hasSprite(id) ? spriteUrl(id) : null);

/** CSS px per native pixel for characters, dice and interface-kit pieces. */
export const KIT_SCALE = LAYOUT.kitScale;

function make(id: string, w: number, h: number, cls: string): HTMLElement {
  const url = urlOf(id);
  if (!url) {
    const ph = document.createElement('span');
    ph.className = `sprite sprite-missing ${cls}`.trim();
    ph.dataset['sprite'] = id;
    ph.style.width = `${w}px`;
    ph.style.height = `${h}px`;
    return ph;
  }
  const img = document.createElement('img');
  img.className = `sprite ${cls}`.trim();
  img.src = url;
  img.alt = '';
  img.draggable = false;
  img.decoding = 'sync';
  img.dataset['sprite'] = id;
  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
  return img;
}

/** An <img> showing a sprite at a scale (CSS px per native px), or an empty placeholder box if missing. */
export function spriteImg(id: string, scale = 1, cls = ''): HTMLElement {
  const info = spriteInfo(id);
  return make(id, (info?.w ?? 16) * scale, (info?.h ?? 16) * scale, cls);
}

/**
 * An icon shown `px` CSS pixels wide. The toy icons are 36 px native and are only ever shown at
 * 18, 24, 36 or 48 px; items and doors (48 native) at 24, 32 or 48; the reroll icon at 32 or 48.
 */
export function icon(id: string, px: number, cls = ''): HTMLElement {
  const info = spriteInfo(id);
  const ratio = info ? info.h / info.w : 1;
  return make(id, px, Math.round(px * ratio), `icon ${cls}`.trim());
}

/** The part of a sprite's canvas that is shown (native pixels). */
interface Crop { x: number; y: number; w: number; h: number }
/**
 * Item and door canvases are 48 px squares that are partly empty. These windows hold every
 * item / every door completely (measured over all of them) and leave out the empty rows and columns.
 */
const ITEM_CROP: Crop = { x: 0, y: 2, w: 48, h: 42 };
const DOOR_CROP: Crop = { x: 8, y: 1, w: 32, h: 45 };
/** Heroes in strips: the whole miniature down to the top of its base. */
const HERO_CROP: Crop = { x: 0, y: 1, w: 58, h: 66 };

/** A box exactly as big as the shown part of a sprite, the sprite drawn inside it as a background: nothing can spill out of it. */
function cropped(id: string, scale: number, crop: Crop, cls: string): HTMLElement {
  const info = spriteInfo(id);
  const url = urlOf(id);
  const el = document.createElement('span');
  el.className = `sprite-crop ${cls}`.trim();
  el.dataset['sprite'] = id;
  el.style.width = `${crop.w * scale}px`;
  el.style.height = `${crop.h * scale}px`;
  if (info && url) {
    el.style.backgroundImage = `url("${url}")`;
    el.style.backgroundSize = `${info.w * scale}px ${info.h * scale}px`;
    el.style.backgroundPosition = `${-crop.x * scale}px ${-crop.y * scale}px`;
  } else {
    el.classList.add('sprite-missing');
  }
  return el;
}

/**
 * A picture of an item or door. `big` (cards, the item sheet) draws it at 2 CSS px per pixel like the
 * characters; otherwise (rows in lists) at 1.
 */
export function picture(id: string, big = true): HTMLElement {
  return cropped(id, big ? KIT_SCALE : 1, id.startsWith('door.') ? DOOR_CROP : ITEM_CROP, 'picture');
}

/** A whole miniature for the party strip, 1 CSS px per pixel. */
export function portrait(id: string): HTMLElement {
  return cropped(id, 1, HERO_CROP, 'portrait');
}

/** Load and decode a set of sprites now, so the first screen that uses them is never drawn without them. */
export function preload(ids: readonly string[]): Promise<void> {
  const jobs = ids.map((id) => {
    const url = urlOf(id);
    if (!url) return Promise.resolve();
    const img = new Image();
    img.src = url;
    kept.push(img);
    return typeof img.decode === 'function' ? img.decode().catch(() => undefined) : new Promise<void>((r) => { img.onload = img.onerror = () => r(); });
  });
  return Promise.all(jobs).then(() => undefined);
}
const kept: HTMLImageElement[] = [];

// ------------------------------------------------------------ pixel text
// Titles, buttons and numbers are drawn with art's bitmap fonts. The real characters stay in
// the page (invisible, one per glyph box), so textContent, tests and screen readers still read
// the words. Colour and size come from CSS: --px-font (which atlas) and --px-s (scale).

const SUBSTITUTE: Record<string, string> = { '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-' };

function glyphSpan(font: BitmapFont, ch: string): HTMLElement {
  const el = document.createElement('span');
  const key = (SUBSTITUTE[ch] ?? ch).toUpperCase();
  const g = font.glyphs[key];
  el.textContent = ch;
  if (!g) {
    el.className = 'pxg pxs';
    el.style.setProperty('--ga', String(font.space));
    return el;
  }
  el.className = 'pxg';
  el.style.setProperty('--gx', String(g.x));
  el.style.setProperty('--gy', String(g.y));
  el.style.setProperty('--gw', String(g.w));
  el.style.setProperty('--gh', String(g.h));
  el.style.setProperty('--ga', String(g.advance));
  return el;
}

/** Can every character of this text be drawn with the big number font? */
export function isBigNumber(text: string): boolean {
  return text.length > 0 && Array.from(text).every((c) => FONT.big.glyphs[c] !== undefined);
}

/** Glyph boxes for a text: words stay whole when a line wraps. */
function glyphNodes(text: string, big: boolean): Node[] {
  const font = big ? FONT.big : FONT.small;
  const out: Node[] = [];
  let word: HTMLElement | null = null;
  for (const ch of Array.from(text)) {
    if (ch === ' ' || ch === '\n') {
      word = null;
      const sp = document.createElement('span');
      sp.className = 'pxg pxs';
      sp.textContent = ' ';
      sp.style.setProperty('--ga', String(font.space));
      out.push(sp);
      continue;
    }
    if (!word) {
      word = document.createElement('span');
      word.className = 'pxw';
      out.push(word);
    }
    word.append(glyphSpan(font, ch));
  }
  return out;
}

/** A span of pixel text. `big` = the number font (digits and + - / only). */
export function pixelText(text: string, opts: { big?: boolean; cls?: string; testid?: string } = {}): HTMLElement {
  const big = opts.big ?? false;
  const el = document.createElement('span');
  el.className = `px ${big ? 'px-big' : 'px-small'} ${opts.cls ?? ''}`.trim();
  if (opts.testid) el.dataset['testid'] = opts.testid;
  el.dataset['px'] = text;
  el.append(...glyphNodes(text, big));
  return el;
}

/** Elements whose own text is drawn with the pixel font (see pixelize). */
const PIXEL_SELECTOR = '.btn, h1, h2, .tab, .pxt, .turn-label, .act-label, .rarity-tag, .sheet-sub, .end-title, .title, .coach-n, .lock-first, .picked-mark, .face-up';
/** Elements whose text is a number drawn with the big number font when it can be. */
const NUMBER_SELECTOR = '.pxn, .big-plus, .plus-icon';

function convert(el: Element, big: boolean): void {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const text = node.textContent ?? '';
    if (text.trim() === '') continue;
    const useBig = big && isBigNumber(text.trim());
    const span = document.createElement('span');
    span.className = `px ${useBig ? 'px-big' : 'px-small'}`;
    span.append(...glyphNodes(useBig ? text.trim() : text, useBig));
    node.replaceWith(span);
  }
}

/** Draw the text of every title, button and number under `root` with the pixel fonts. Safe to call again. */
export function pixelize(root: ParentNode): void {
  if (root instanceof Element) {
    if (root.matches(PIXEL_SELECTOR)) convert(root, false);
    else if (root.matches(NUMBER_SELECTOR)) convert(root, true);
  }
  for (const el of root.querySelectorAll(PIXEL_SELECTOR)) convert(el, false);
  for (const el of root.querySelectorAll(NUMBER_SELECTOR)) convert(el, true);
}

/** Keep everything inside `host` pixelized as screens, sheets and labels come and go. Event-driven: nothing runs while idle. */
export function autoPixelize(host: Element): void {
  pixelize(host);
  if (typeof MutationObserver !== 'function') return;
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') {
        const p = r.target.parentElement;
        if (p && !p.closest('.px')) pixelize(p);
        continue;
      }
      const t = r.target as Element;
      if (t.closest?.('.px')) continue;
      pixelize(t);
    }
  }).observe(host, { childList: true, subtree: true, characterData: true });
}
