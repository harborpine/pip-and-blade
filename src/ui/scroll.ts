/**
 * Scrolling and screen height. The rule: the page itself never scrolls, bounces or zooms, and
 * anything that can be taller than its space scrolls INSIDE itself with a finger.
 *
 * - `scrollBox(name, ...)` is the one scroll container used everywhere (class `scroll-y`,
 *   `data-testid="scroll-<name>"`). It keeps `data-more-top` / `data-more-bottom` up to date so
 *   the styles can fade the edge that still hides content.
 * - `lockPageGestures()` blocks page-level touch scrolling, but lets a finger that starts inside
 *   a scroll container that really overflows through.
 * - `trackViewport()` publishes the visible height as `--vvh` (Safari's toolbars change it in a tab).
 */
import { h } from './dom';
import type { Child, Props } from './dom';

function refresh(el: HTMLElement): void {
  const max = el.scrollHeight - el.clientHeight;
  el.dataset['overflow'] = String(max > 1);
  el.dataset['moreTop'] = String(max > 1 && el.scrollTop > 1);
  el.dataset['moreBottom'] = String(max > 1 && el.scrollTop < max - 1);
}

/** Turn an element into a finger-scrollable region with "more above / below" hints. */
export function makeScrollable<T extends HTMLElement>(el: T, name: string): T {
  el.classList.add('scroll-y');
  el.dataset['testid'] = `scroll-${name}`;
  el.dataset['overflow'] = 'false';
  el.dataset['moreTop'] = 'false';
  el.dataset['moreBottom'] = 'false';
  const update = (): void => refresh(el);
  el.addEventListener('scroll', update, { passive: true });
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);
    if (typeof MutationObserver === 'function') {
      new MutationObserver(() => {
        for (const c of Array.from(el.children)) ro.observe(c);
        update();
      }).observe(el, { childList: true });
    }
  }
  queueMicrotask(update);
  return el;
}

/** A `<div class="scroll-y">` with `data-testid="scroll-<name>"`. Extra classes go in props.class. */
export function scrollBox(name: string, props: Props = {}, ...children: Child[]): HTMLDivElement {
  return makeScrollable(h('div', props, ...children), name);
}

/** May a finger that went down on `target` scroll something? Only inside a scroll container that overflows. */
export function touchMayScroll(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  const box = el?.closest<HTMLElement>('.scroll-y');
  return !!box && box.scrollHeight > box.clientHeight + 1;
}

/** No page scroll, bounce, pinch or double-tap zoom, text selection or callouts during play. */
export function lockPageGestures(): void {
  for (const t of ['gesturestart', 'gesturechange', 'gestureend'] as const) {
    document.addEventListener(t, (e) => e.preventDefault());
  }
  document.addEventListener('touchmove', (e) => {
    // Two fingers = a pinch: never. One finger: only inside a scroll container with hidden content.
    if (e.touches.length > 1 || !touchMayScroll(e.target)) e.preventDefault();
  }, { passive: false });
  // iOS only shows :active (the pressed look of buttons) when the page listens for touches.
  document.addEventListener('touchstart', () => {}, { passive: true });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
}

/**
 * Publish the visible height as the CSS variable `--vvh` (in px). The layout uses
 * `min(100dvh, var(--vvh))`, so it is right both where `dvh` works and where it does not.
 */
export function trackViewport(): void {
  const vv = window.visualViewport;
  const set = (): void => {
    const hgt = vv && vv.scale > 0.99 && vv.scale < 1.01 ? vv.height : window.innerHeight;
    if (hgt > 0) document.documentElement.style.setProperty('--vvh', `${Math.round(hgt * 100) / 100}px`);
    // Safari can leave the page scrolled a few pixels after its toolbars move.
    if (document.scrollingElement && document.scrollingElement.scrollTop !== 0) document.scrollingElement.scrollTop = 0;
  };
  set();
  vv?.addEventListener('resize', set);
  window.addEventListener('resize', set);
  window.addEventListener('orientationchange', set);
}

/** True when launched from the Home Screen (no browser bars). */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches);
}
