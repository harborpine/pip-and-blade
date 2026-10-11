/**
 * iPhone layout checks, run inside the page. Returns a list of human-readable problems (empty = fine).
 *
 *  - the page must not scroll (document.scrollingElement), horizontally or vertically
 *  - the screen must not hide content behind overflow (except inside .scrollable lists)
 *  - every visible interactive element is at least 44x44 CSS px
 *  - nothing interactive sticks out of the viewport
 *  - nothing interactive covers another interactive element, and each one is really hit by a tap at its centre
 *  - in a fight, the dice, padlocks, Reroll, Undo and End Turn sit in the lower half of the screen
 */
import type { Page } from '@playwright/test';

export interface LayoutOptions {
  /** Ignore the 44px rule for these test ids (never used to hide a failure: only for decorative hit areas). */
  skipSize?: string[];
}

export async function layoutIssues(page: Page, opts: LayoutOptions = {}): Promise<string[]> {
  return page.evaluate((o) => {
    const issues: string[] = [];
    // Words that are in the DOM but intentionally not drawn (padlock and die words) must not count as spilling content.
    const hidden = [...document.querySelectorAll<HTMLElement>('.lock-word, .die-word')];
    const prevDisplay = hidden.map((e) => e.style.display);
    hidden.forEach((e) => {
      e.style.display = 'none';
    });
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const se = document.scrollingElement as HTMLElement;
    if (se.scrollHeight > se.clientHeight + 1) issues.push(`page scrolls vertically (${se.scrollHeight} > ${se.clientHeight})`);
    if (se.scrollWidth > se.clientWidth + 1) issues.push(`page scrolls horizontally (${se.scrollWidth} > ${se.clientWidth})`);
    if (document.body.scrollHeight > vh + 1) issues.push(`body taller than the screen (${document.body.scrollHeight} > ${vh})`);
    if (document.body.scrollWidth > vw + 1) issues.push(`body wider than the screen (${document.body.scrollWidth} > ${vw})`);

    const name = (el: Element): string => {
      const e = el as HTMLElement;
      const id = e.dataset?.['testid'];
      const txt = (e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
      return id ? `[${id}]` : `<${el.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''}> "${txt}"`;
    };

    // Content hidden by the screen's own overflow (lists inside .scrollable are allowed to scroll).
    const root = document.querySelector<HTMLElement>('#app > .screen');
    if (root) {
      if (root.scrollHeight > root.clientHeight + 1 && getComputedStyle(root).overflowY !== 'auto') {
        issues.push(`screen content is cut off: ${root.scrollHeight} tall in ${root.clientHeight}`);
      }
      if (root.scrollWidth > root.clientWidth + 1) issues.push(`screen content is wider than the screen: ${root.scrollWidth} > ${root.clientWidth}`);
    }

    // Text or pictures that spill out of the box that is meant to hold them (cut off, or poking out over a neighbour).
    const spill = new Set<string>();
    for (const el of document.querySelectorAll<HTMLElement>('#app *, #overlays *')) {
      // Pixel-font text is invisible glyph boxes (.px) and die/padlock words are not drawn (.die-word, .lock-word): see src/ui/TESTING.md.
      if (el.closest('.fx-layer, .px, .die-word, .lock-word') || el instanceof SVGElement || el.tagName === 'IMG') continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.display === 'inline' || /(auto|scroll)/.test(cs.overflowY)) continue;
      if (el.clientHeight === 0 || el.clientWidth === 0) continue;
      if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        spill.add(`content spills out of its box: ${name(el)} (${el.scrollWidth}x${el.scrollHeight} content in ${el.clientWidth}x${el.clientHeight})`);
      }
    }
    issues.push(...spill);

    // The pixel-font text itself: the hidden DOM text inside .px is ignored above, but the box that DRAWS each
    // piece of pixel text must lie inside the box that holds it and inside the screen (same strictness as plain text).
    const pxSeen = new Set<string>();
    for (const px of document.querySelectorAll<HTMLElement>('.px')) {
      if (px.parentElement?.closest('.px') || px.closest('.fx-layer')) continue;
      const pr = px.getBoundingClientRect();
      if (pr.width === 0 || pr.height === 0) continue;
      const cs = getComputedStyle(px);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (pr.right < 0 || pr.left > vw || pr.bottom < 0 || pr.top > vh) continue;
      let host: HTMLElement | null = px.parentElement;
      while (host && host.closest('.px')) host = host.parentElement;
      if (host && host !== document.body) {
        const hr = host.getBoundingClientRect();
        const l = hr.left;
        let t = hr.top;
        const r = hr.right;
        let b = hr.bottom;
        const hs = getComputedStyle(host);
        if (/(auto|scroll)/.test(hs.overflowY)) {
          // inside a scroll box the text may be scrolled out of view; only the horizontal fit is measured
          t = -Infinity;
          b = Infinity;
        }
        if (pr.left < l - 2 || pr.right > r + 2 || pr.top < t - 2 || pr.bottom > b + 2) {
          pxSeen.add(`pixel text spills out of its box: "${(px.textContent ?? '').slice(0, 20)}" ${Math.round(pr.width)}x${Math.round(pr.height)} in ${name(host)} ${Math.round(hr.width)}x${Math.round(hr.height)}`);
        }
      }
      if (pr.left < -0.5 || pr.right > vw + 0.5) pxSeen.add(`pixel text outside the screen: "${(px.textContent ?? '').slice(0, 20)}"`);
    }
    issues.push(...pxSeen);

    const modal = document.querySelector('#overlays .modal-back');
    const scope: ParentNode = modal ?? document;
    const sel = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="switch"], [role="tab"], [tabindex]:not([tabindex="-1"])';
    const all = [...scope.querySelectorAll<HTMLElement>(sel)].filter((el) => {
      if (!modal && el.closest('#overlays')) return false;
      if (el.closest('#rotate-overlay')) return false;
      if (el.hidden || el.closest('[hidden]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    interface Item { el: HTMLElement; rect: DOMRect; vis: { l: number; t: number; r: number; b: number } | null; scrolled: boolean }
    const items: Item[] = all.map((el) => {
      const rect = el.getBoundingClientRect();
      let l = Math.max(rect.left, 0);
      let t = Math.max(rect.top, 0);
      let r = Math.min(rect.right, vw);
      let b = Math.min(rect.bottom, vh);
      let scrolled = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll)/.test(cs.overflowY) || /(auto|scroll)/.test(cs.overflowX)) {
          scrolled = true;
          const pr = p.getBoundingClientRect();
          l = Math.max(l, pr.left);
          t = Math.max(t, pr.top);
          r = Math.min(r, pr.right);
          b = Math.min(b, pr.bottom);
        }
      }
      return { el, rect, vis: r - l > 1 && b - t > 1 ? { l, t, r, b } : null, scrolled };
    });

    for (const it of items) {
      const n = name(it.el);
      const id = it.el.dataset['testid'] ?? '';
      if (it.rect.width < 43.5 || it.rect.height < 43.5) {
        if (!(o.skipSize ?? []).includes(id) && (it.vis || !it.scrolled)) issues.push(`too small to tap: ${n} is ${Math.round(it.rect.width)}x${Math.round(it.rect.height)}`);
      }
      if (!it.scrolled && (it.rect.left < -0.5 || it.rect.top < -0.5 || it.rect.right > vw + 0.5 || it.rect.bottom > vh + 0.5)) {
        issues.push(`outside the screen: ${n} at ${Math.round(it.rect.left)},${Math.round(it.rect.top)} to ${Math.round(it.rect.right)},${Math.round(it.rect.bottom)} (screen ${vw}x${vh})`);
      }
      if (it.vis) {
        const cx = (it.vis.l + it.vis.r) / 2;
        const cy = (it.vis.t + it.vis.b) / 2;
        const top = document.elementFromPoint(cx, cy);
        if (!top || !(it.el === top || it.el.contains(top))) issues.push(`cannot be tapped at its centre (something else is on top): ${n} is covered by ${top ? name(top) : 'nothing'}`);
      }
    }

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i] as Item;
        const b = items[j] as Item;
        if (!a.vis || !b.vis) continue;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.vis.r, b.vis.r) - Math.max(a.vis.l, b.vis.l);
        const h = Math.min(a.vis.b, b.vis.b) - Math.max(a.vis.t, b.vis.t);
        // A padlock overlaps the foot of its own die by up to 20 px on the tightest layouts, on purpose.
        const ia = a.el.dataset['testid'] ?? '';
        const ib = b.el.dataset['testid'] ?? '';
        const lockOverDie = ((ia.startsWith('die-') && ib === 'lock-' + ia.slice(4)) || (ib.startsWith('die-') && ia === 'lock-' + ib.slice(4))) && h <= 20;
        if (lockOverDie && w > 2 && h > 2) {
          // Approved overlap (padlock over the foot of its own die): the padlock must stay fully on top and tappable.
          const lockEl = ia.startsWith('lock-') ? a : b;
          const dieEl = ia.startsWith('lock-') ? b : a;
          const ox = (Math.max(a.vis.l, b.vis.l) + Math.min(a.vis.r, b.vis.r)) / 2;
          const oy = (Math.max(a.vis.t, b.vis.t) + Math.min(a.vis.b, b.vis.b)) / 2;
          const hit = document.elementFromPoint(ox, oy);
          if (!hit || !(lockEl.el === hit || lockEl.el.contains(hit))) issues.push(`padlock art is hidden by its die: ${name(lockEl.el)} under ${name(dieEl.el)} at the overlap`);
          if (dieEl.rect.width < 43.5 || dieEl.rect.height < 43.5 || lockEl.rect.width < 43.5 || lockEl.rect.height < 43.5) issues.push(`die/padlock pair too small: ${name(dieEl.el)} ${Math.round(dieEl.rect.width)}x${Math.round(dieEl.rect.height)}, ${name(lockEl.el)} ${Math.round(lockEl.rect.width)}x${Math.round(lockEl.rect.height)}`);
        }
        if (w > 2 && h > 2 && !lockOverDie) issues.push(`overlapping controls: ${name(a.el)} and ${name(b.el)} (${Math.round(w)}x${Math.round(h)} px)`);
      }
    }

    if (document.body.dataset['screen'] === 'fight') {
      for (const it of items) {
        const id = it.el.dataset['testid'] ?? '';
        if (/^(die-\d+|lock-\d+|btn-reroll|btn-undo|btn-end-turn)$/.test(id)) {
          const mid = (it.rect.top + it.rect.bottom) / 2;
          if (mid < vh / 2) issues.push(`primary control not in the lower half: [${id}] centre at y=${Math.round(mid)} of ${vh}`);
        }
      }
    }
    hidden.forEach((e, i) => {
      e.style.display = prevDisplay[i] ?? '';
    });
    return issues;
  }, opts);
}
