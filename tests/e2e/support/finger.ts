/**
 * Finger-scroll helpers (0.2.0).
 *
 * Playwright's WebKit on Windows cannot construct `Touch` objects and does not scroll natively from
 * script-made touches (see src/ui/TESTING.md, "Scrolling"). So a finger drag is simulated the way
 * TESTING.md describes: plain `Event` objects of type touchstart / touchmove / touchend with the
 * touch lists defined, dispatched at the element under the finger. What a real Safari does with
 * those events is decided by one thing the page controls: whether any touchmove comes back
 * `defaultPrevented` (that cancellation is exactly what stopped Safari scrolling in 0.1.0, and a
 * mouse wheel is unaffected, which is why the old wheel-based tests never saw it). Then the content
 * is scrolled to its end with the wheel, and the last item is checked.
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export interface DragResult {
  moves: number;
  prevented: number;
  startedOn: string;
}

/** A finger drag inside `selector`'s box: touchstart, 8 touchmoves, touchend. `dir` is the finger's direction. */
export async function fingerDrag(page: Page, selector: string, dir: 'up' | 'down'): Promise<DragResult> {
  return page.evaluate(
    ({ sel, d }) => {
      const box = document.querySelector(sel) as HTMLElement | null;
      if (!box) throw new Error(`no element ${sel}`);
      const r = box.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2);
      const top = Math.max(r.top, 0) + 12;
      const bottom = Math.min(r.bottom, window.innerHeight) - 12;
      const y0 = d === 'up' ? bottom : top;
      const y1 = d === 'up' ? top : bottom;
      const target = document.elementFromPoint(x, y0);
      if (!target) throw new Error('nothing under the finger');
      const make = (type: string, y: number): Event => {
        const t = { identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y, radiusX: 1, radiusY: 1, force: 1 };
        const e = new Event(type, { bubbles: true, cancelable: true, composed: true });
        const list = type === 'touchend' ? [] : [t];
        Object.defineProperty(e, 'touches', { value: list });
        Object.defineProperty(e, 'targetTouches', { value: list });
        Object.defineProperty(e, 'changedTouches', { value: [t] });
        return e;
      };
      let prevented = 0;
      let moves = 0;
      target.dispatchEvent(make('touchstart', y0));
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const e = make('touchmove', y0 + ((y1 - y0) * i) / steps);
        target.dispatchEvent(e);
        moves += 1;
        if (e.defaultPrevented) prevented += 1;
      }
      target.dispatchEvent(make('touchend', y1));
      const tid = (target as HTMLElement).dataset['testid'];
      return { moves, prevented, startedOn: `${target.tagName.toLowerCase()}${tid ? `[${tid}]` : ''}` };
    },
    { sel: selector, d: dir },
  );
}

/** What the 0.1.0 build did: cancel every touchmove that does not start inside `.scrollable` (sheets were not). */
export const OLD_BUG_BLOCKER = `
  document.addEventListener('touchmove', function (e) {
    var target = e.target;
    if (!(target && target.closest && target.closest('.scrollable'))) e.preventDefault();
  }, { passive: false });
`;

interface PageState {
  top: number;
  left: number;
  overflowY: number;
  overflowX: number;
}

export async function pageState(page: Page): Promise<PageState> {
  return page.evaluate(() => {
    const se = document.scrollingElement as HTMLElement;
    return { top: se.scrollTop, left: se.scrollLeft, overflowY: se.scrollHeight - se.clientHeight, overflowX: se.scrollWidth - se.clientWidth };
  });
}

/** The page itself never scrolls, bounces or overflows. */
export async function expectPageStill(page: Page, when: string): Promise<void> {
  const s = await pageState(page);
  expect(s.top, `page scrollTop ${when}`).toBe(0);
  expect(s.left, `page scrollLeft ${when}`).toBe(0);
  expect(s.overflowY, `page taller than the screen ${when}`).toBeLessThanOrEqual(1);
  expect(s.overflowX, `page wider than the screen ${when}`).toBeLessThanOrEqual(1);
}

interface Info {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
  rectTop: number;
  rectBottom: number;
  vh: number;
  attr: string | null;
  moreTop: string | null;
  moreBottom: string | null;
}

const info = (page: Page, sel: string): Promise<Info> =>
  page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement;
    const r = el.getBoundingClientRect();
    return {
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      scrollTop: el.scrollTop,
      rectTop: r.top,
      rectBottom: r.bottom,
      vh: window.visualViewport?.height ?? window.innerHeight,
      attr: el.getAttribute('data-overflow'),
      moreTop: el.getAttribute('data-more-top'),
      moreBottom: el.getAttribute('data-more-bottom'),
    };
  }, sel);

/**
 * Scroll to the end / start in wheel-sized steps. Playwright's mobile WebKit has no mouse wheel
 * ("Mouse wheel is not supported in mobile WebKit"), so the steps are scrollBy calls; they scroll the
 * same box a finger or wheel would, and the browser then applies scroll limits, snapping and the
 * scroll event (which updates the "more above / below" hints). The native-touch path is covered by
 * the Chromium test in scrolling.spec.ts. Returns false if the container would not move at all.
 */
async function wheelTo(page: Page, sel: string, to: 'end' | 'start'): Promise<boolean> {
  let moved = false;
  for (let n = 0; n < 200; n++) {
    const i = await info(page, sel);
    const atEnd = to === 'end' ? i.scrollTop + i.clientHeight >= i.scrollHeight - 1 : i.scrollTop <= 0;
    if (atEnd) return true;
    await page.locator(sel).evaluate((el, dy) => el.scrollBy({ top: dy, behavior: 'instant' }), to === 'end' ? 120 : -120);
    const j = await info(page, sel);
    if (j.scrollTop !== i.scrollTop) moved = true;
    else return moved;
  }
  return moved;
}

export interface Audit {
  selector: string;
  overflow: boolean;
  checkedLast: boolean;
}

/**
 * Audit one scroll container: it lies on screen; if it overflows, a finger drag is not cancelled, it
 * can be scrolled to its end, the end hint changes, the last item is fully inside and a tap on it
 * lands on it. The page itself never scrolls.
 */
export async function auditContainer(page: Page, testid: string, nth = 0): Promise<Audit> {
  const where = testid;
  await page.evaluate(
    ([id, n]) => {
      const top = [...document.querySelectorAll<HTMLElement>('#overlays .modal-back')].at(-1) ?? null;
      const vis = [...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && (!top || top.contains(el));
      });
      const el = vis[n as number];
      if (!el) throw new Error(`no visible ${id} #${n}`);
      el.setAttribute('data-qa-audit', '1');
    },
    [testid, nth] as const,
  );
  const S = `[data-testid="${testid}"][data-qa-audit="1"]`;
  try {
    const i = await info(page, S);
    await expectPageStill(page, `before scrolling ${where}`);
    // The container itself must lie within the visible viewport (a sheet taller than the screen is the old bug).
    expect(i.rectTop, `${where} starts on screen`).toBeGreaterThanOrEqual(-1);
    expect(i.rectBottom, `${where} ends on screen (visible height ${Math.round(i.vh)})`).toBeLessThanOrEqual(i.vh + 1);
    const overflows = i.scrollHeight > i.clientHeight + 1;
    expect(i.attr === 'true', `${where}: data-overflow (${i.attr}) agrees with the real overflow (${i.scrollHeight} in ${i.clientHeight})`).toBe(overflows);
    if (!overflows) return { selector: where, overflow: false, checkedLast: false };

    // 1. A finger drag is not cancelled, in both directions.
    for (const dir of ['up', 'down'] as const) {
      const d = await fingerDrag(page, S, dir);
      expect(d.moves).toBeGreaterThan(3);
      expect(d.prevented, `${where}: touchmove cancelled by the page while dragging ${dir} (started on ${d.startedOn})`).toBe(0);
    }
    await expectPageStill(page, `after finger drags on ${where}`);

    // 2. Start position: hint says there is more below, not above.
    await page.locator(S).evaluate((el) => {
      el.scrollTop = 0;
    });
    await expect.poll(async () => (await info(page, S)).moreBottom, { message: `${where}: "more below" hint at the top` }).toBe('true');
    await expect.poll(async () => (await info(page, S)).moreTop, { message: `${where}: no "more above" hint at the top` }).not.toBe('true');

    // 3. Scroll to the end with the wheel (a mouse wheel works even where touch is blocked); if this
    //    browser does not apply wheel input at all, fall back to setting scrollTop.
    const wheelWorked = await wheelTo(page, S, 'end');
    let end = await info(page, S);
    if (!(end.scrollTop + end.clientHeight >= end.scrollHeight - 1)) {
      expect(wheelWorked, `${where}: the container scrolls`).toBe(true);
      await page.locator(S).evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      end = await info(page, S);
    }
    expect(end.scrollTop + end.clientHeight, `${where}: reached the end`).toBeGreaterThanOrEqual(end.scrollHeight - 1);
    await expectPageStill(page, `after scrolling ${where} to its end`);
    // The hints follow the scroll event, which fires a frame after the scroll: poll briefly.
    await expect.poll(async () => (await info(page, S)).moreBottom, { message: `${where}: "more below" hint gone at the end` }).not.toBe('true');
    await expect.poll(async () => (await info(page, S)).moreTop, { message: `${where}: "more above" hint at the end` }).toBe('true');

    // 4. The last item is fully inside the container's visible box, and a tap at its centre lands on it.
    const last = await page.evaluate((s) => {
      const box = document.querySelector(s) as HTMLElement;
      const visibleKids = (p: Element): HTMLElement[] =>
        [...p.children].filter((c): c is HTMLElement => {
          const cs = getComputedStyle(c);
          const r = c.getBoundingClientRect();
          return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.position !== 'fixed' && cs.position !== 'absolute' && r.width > 0 && r.height > 0;
        });
      let item: HTMLElement | undefined = visibleKids(box).at(-1);
      if (!item) return null;
      while (item.getBoundingClientRect().height > box.clientHeight + 1) {
        const kid: HTMLElement | undefined = visibleKids(item).at(-1);
        if (!kid) break;
        item = kid;
      }
      item.setAttribute('data-qa-last', '1');
      const cr = box.getBoundingClientRect();
      const ir = item.getBoundingClientRect();
      const visTop = Math.max(ir.top, cr.top);
      const visBottom = Math.min(ir.bottom, cr.bottom);
      const x = ir.left + ir.width / 2;
      const y = (visTop + visBottom) / 2;
      const hit = document.elementFromPoint(x, y) as HTMLElement | null;
      const label = (e: HTMLElement): string => `${e.tagName.toLowerCase()}${e.dataset['testid'] ? `[${e.dataset['testid']}]` : e.className ? '.' + String(e.className).split(' ')[0] : ''}`;
      return {
        name: label(item),
        itemTop: ir.top,
        itemBottom: ir.bottom,
        boxTop: cr.top,
        boxBottom: cr.bottom,
        tall: ir.height > box.clientHeight + 1,
        hit: !!hit && (hit === item || item.contains(hit)),
        hitName: hit ? label(hit) : 'nothing',
        px: x - ir.left,
        py: y - ir.top,
      };
    }, S);
    if (!last) throw new Error(`${where} overflows but has no visible content`);
    try {
      if (!last.tall) {
        expect(last.itemBottom, `${where}: last item ${last.name} bottom is inside the container`).toBeLessThanOrEqual(last.boxBottom + 1);
        expect(last.itemTop, `${where}: last item ${last.name} top is inside the container`).toBeGreaterThanOrEqual(last.boxTop - 1);
      } else {
        // A single block taller than the container (a long paragraph): its END must be in view.
        expect(last.itemBottom, `${where}: end of last block ${last.name} is inside the container`).toBeLessThanOrEqual(last.boxBottom + 1);
        expect(last.itemBottom).toBeGreaterThanOrEqual(last.boxTop);
      }
      expect(last.hit, `${where}: a tap at the centre of ${last.name} lands on it (it hits ${last.hitName})`).toBe(true);
      await page.locator('[data-qa-last="1"]').tap({ trial: true, position: { x: last.px, y: last.py } });
    } finally {
      await page.locator('[data-qa-last="1"]').evaluateAll((els) => els.forEach((e) => e.removeAttribute('data-qa-last')));
    }
    await expectPageStill(page, `after checking the last item of ${where}`);

    // 5. And back up: the hints flip again.
    await wheelTo(page, S, 'start');
    await page.locator(S).evaluate((el) => {
      el.scrollTop = 0;
    });
    await expect.poll(async () => (await info(page, S)).moreTop, { message: `${where}: no "more above" hint back at the top` }).not.toBe('true');
    await expect.poll(async () => (await info(page, S)).moreBottom, { message: `${where}: "more below" hint back at the top` }).toBe('true');
    await expectPageStill(page, `after returning to the top of ${where}`);
    return { selector: where, overflow: true, checkedLast: true };
  } finally {
    await page
      .locator(S)
      .evaluate((el) => el.removeAttribute('data-qa-audit'))
      .catch(() => undefined);
  }
}

/**
 * Test ids of the scroll containers a finger can reach right now: the visible ones, and when a sheet
 * or dialog is open only those inside the topmost one (the screen under it is covered).
 */
export const visibleContainers = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const backs = [...document.querySelectorAll<HTMLElement>('#overlays .modal-back')];
    const top = backs.at(-1) ?? null;
    return [...document.querySelectorAll<HTMLElement>('[data-testid^="scroll-"]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (!(r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none')) return false;
        return top ? top.contains(el) : true;
      })
      .map((el) => el.dataset['testid'] ?? '');
  });

/** Test ids of every scroll container in the DOM (even an empty, zero-height one). */
export const allContainers = (page: Page): Promise<string[]> =>
  page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-testid^="scroll-"]')].map((el) => el.dataset['testid'] ?? ''));
