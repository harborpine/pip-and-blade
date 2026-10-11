/** The ONE place the UI reaches the art library. Every lookup is guarded: a missing sprite shows a placeholder box. */
import { hasSprite, sprite, spriteUrl } from '@art';
import type { SpriteInfo } from '@shared';

export { hasSprite };
export const spriteInfo = (id: string): SpriteInfo | null => (hasSprite(id) ? sprite(id) : null);
export const urlOf = (id: string): string | null => (hasSprite(id) ? spriteUrl(id) : null);

/** An <img> showing a sprite at an integer scale (or an empty placeholder box if missing). */
export function spriteImg(id: string, scale = 1, cls = ''): HTMLElement {
  const info = spriteInfo(id);
  const url = urlOf(id);
  if (!info || !url) {
    const ph = document.createElement('span');
    ph.className = `sprite sprite-missing ${cls}`.trim();
    ph.dataset['sprite'] = id;
    ph.style.width = `${16 * scale}px`;
    ph.style.height = `${16 * scale}px`;
    return ph;
  }
  const img = document.createElement('img');
  img.className = `sprite ${cls}`.trim();
  img.src = url;
  img.alt = '';
  img.draggable = false;
  img.decoding = 'sync';
  img.dataset['sprite'] = id;
  img.style.width = `${info.w * scale}px`;
  img.style.height = `${info.h * scale}px`;
  return img;
}
