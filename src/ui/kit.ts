/**
 * The interface kit, handed to the stylesheets. For every `kit.*` sprite in the art manifest this
 * publishes CSS variables on :root, so the CSS never repeats a file name, a slice or a size:
 *
 *   --kit-<name>         url(...) of the piece
 *   --kit-<name>-slice   its 9-slice insets, ready for border-image-slice ("4 4 8 4 fill")
 *   --kit-<name>-bw      the matching border widths in CSS px ("8px 8px 16px 8px")
 *   --kit-<name>-w / -h  its size in CSS px (fixed pieces)
 *
 * plus --bg-<name> for the backgrounds and a few see-through inks made from the palette's ink
 * (--ink-20 ... --ink-80). Colours themselves come from src/art/generated/palette.css.
 */
import { track } from './anim';
import { ALL_SPRITE_IDS, FONT, KIT_SCALE, PAL, preload, spriteInfo, urlOf } from './art';

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Every picture the style sheet draws with (kit pieces, backdrops, font sheets), by sprite id. */
function cssSpriteIds(): string[] {
  const fonts = Object.values(FONT).flatMap((font) => Object.values(font.sprites));
  return [...ALL_SPRITE_IDS.filter((id) => /^(kit|bg)\./.test(id)), ...fonts];
}

/** The custom properties, with each picture taken from `src` (its address, or the picture itself once loaded). */
function kitRules(src: (id: string) => string | null, fills: ReadonlyMap<string, string> = new Map()): string {
  const lines: string[] = [];
  for (const id of ALL_SPRITE_IDS) {
    const info = spriteInfo(id);
    const url = src(id);
    if (!info || !url) continue;
    const [cat, ...rest] = id.split('.');
    const name = rest.join('_');
    if (cat === 'bg') {
      lines.push(`--bg-${name}: url("${url}");`);
      continue;
    }
    if (cat !== 'kit') continue;
    lines.push(`--kit-${name}: url("${url}");`);
    lines.push(`--kit-${name}-w: ${info.w * KIT_SCALE}px;`, `--kit-${name}-h: ${info.h * KIT_SCALE}px;`);
    const fill = fills.get(id);
    if (fill) lines.push(`--kit-${name}-fill: ${fill};`);
    if (info.slice) {
      lines.push(`--kit-${name}-slice: ${info.slice.join(' ')} fill;`);
      lines.push(`--kit-${name}-bw: ${info.slice.map((n) => `${n * KIT_SCALE}px`).join(' ')};`);
      // Half-width borders: the piece is still drawn at full size, its edge reaching in under the content (for low chips).
      lines.push(`--kit-${name}-bwh: ${info.slice.map((n) => `${(n * KIT_SCALE) / 2}px`).join(' ')};`);
    }
  }
  for (const [key, font] of Object.entries(FONT)) {
    lines.push(`--font-${key}-space: ${font.space};`);
    for (const [colour, id] of Object.entries(font.sprites)) {
      const info = spriteInfo(id);
      const url = src(id);
      if (!info || !url) continue;
      lines.push(`--font-${key}-${colour}: url("${url}");`);
      lines.push(`--font-${key}-w: ${info.w};`, `--font-${key}-h: ${info.h};`);
    }
  }
  const ink = PAL['ink']?.base ?? '#1b1730';
  for (const a of [20, 40, 60, 80]) lines.push(`--ink-${a}: ${rgba(ink, a / 100)};`);
  const white = PAL['white']?.base ?? '#f6f3ea';
  for (const a of [20, 50]) lines.push(`--ivory-${a}: ${rgba(white, a / 100)};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

/** The colour of a piece's middle pixel (what its stretchable middle is filled with), or null if it cannot be read. */
async function middleColour(blob: Blob): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bmp, -Math.floor(bmp.width / 2), -Math.floor(bmp.height / 2));
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return (a ?? 0) === 255 ? `rgb(${r}, ${g}, ${b})` : null;
  } catch {
    return null;
  }
}

function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Publish the kit. Resolves when the interface can be drawn complete.
 *
 * A picture named by its address in the style sheet is fetched only when the first element that wears it
 * appears, and that element is painted bare until it arrives (a tray with no frame, a speech bubble with
 * no bubble). So the pictures the style sheet draws with (small: the kit, the backdrops, the font sheets)
 * are loaded once here and handed to the style sheet as the pictures themselves, and one invisible speck
 * wears all of them from then on so they stay decoded. If that cannot be done (no network yet, a very slow
 * phone) the addresses are used as they are and the game still works.
 */
export function installKit(): Promise<void> {
  const style = document.createElement('style');
  style.id = 'kit-vars';
  style.textContent = kitRules(urlOf);
  document.head.append(style);

  const ids = cssSpriteIds();
  const inlined = Promise.all(ids.map(async (id) => {
    const url = urlOf(id);
    if (!url) return [id, null] as const;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
    const blob = await res.blob();
    return [id, await asDataUrl(blob), id.startsWith('kit.') && spriteInfo(id)?.slice ? await middleColour(blob) : null] as const;
  })).then((rows) => {
    const data = new Map(rows.map(([id, d]) => [id, d] as const));
    const fills = new Map(rows.flatMap(([id, , f]) => (f ? [[id, f] as const] : [])));
    style.textContent = kitRules((id) => data.get(id) ?? urlOf(id), fills);
    return keepWarm(rows.map(([, d]) => d).filter((d): d is string => d !== null));
  }).catch(() => undefined);

  // Dice, icons and effects are ordinary pictures: fetch and decode them up front too (waitIdle() waits for all of this).
  const rest = ALL_SPRITE_IDS.filter((id) => /^(die|ui|fx|sym|kw|status|intent|set)\./.test(id));
  void track(preload(rest));
  const ready = Promise.race([inlined, new Promise<void>((resolve) => setTimeout(resolve, KIT_WAIT_MS))]);
  return track(ready);
}
/** Never hold the first screen back longer than this for the kit. */
const KIT_WAIT_MS = 2500;

/** One invisible speck that wears every style-sheet picture for good, so each stays loaded and decoded. */
function keepWarm(urls: readonly string[]): Promise<void> {
  const el = document.createElement('div');
  el.id = 'kit-warm';
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;z-index:-1;pointer-events:none;';
  el.style.backgroundImage = urls.map((u) => `url("${u}")`).join(',');
  document.body.append(el);
  // Two frames: the speck has been styled and painted.
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
