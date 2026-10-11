/**
 * 0.2.0 finger scrolling (BRIEF-2 section 1, docs/redesign.md section A).
 *
 * The owner could not scroll the "replace a face" sheet with a finger in a Safari tab. The 0.1.0
 * suite passed because it scrolled with the mouse wheel; a wheel is not blocked by a page-level
 * `touchmove` handler that calls preventDefault() (0.1.0: only elements inside `.scrollable` were
 * let through, and the sheets were not), a finger is. So here, for every sheet / list / screen in
 * the audit list, at every phone size the owner's phone class has (Safari tab, Home Screen, small),
 * every scroll container that overflows is driven with finger-style touch events (see
 * support/finger.ts) and must: not have a touchmove cancelled, scroll to its end, show the last
 * item fully inside its box, take a tap at that item's centre, and never let the page scroll.
 *
 * Proof that these tests fail on the old bug: "the detector sees the 0.1.0 bug" below injects the
 * 0.1.0 handler (document-level touchmove preventDefault except inside `.scrollable`) into the
 * current build and the same audit that passes everywhere else then FAILS with "touchmove cancelled
 * by the page". The Chromium test does the same with a real native touch scroll (scrollTop must
 * move with the fix, and must stay 0 with the injected 0.1.0 handler).
 */
import { chromium, expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameState } from '@shared';
import { WINNING_SEED } from './pinned';
import { ORIGIN, eng, expectScreen, idle, openApp, richSave, settle, state, watch } from './support/app';
import { OLD_BUG_BLOCKER, allContainers, auditContainer, expectPageStill, fingerDrag, visibleContainers } from './support/finger';
import { openGame } from './support/fury';
import { pathTo, replay } from './support/reach';
import { SCENES, goDoorThen, route } from './support/uiscenes';
import type { Scene } from './support/uiscenes';
void WINNING_SEED;

const SIZES = [
  { name: 'tab 390x664', width: 390, height: 664 },
  { name: 'tab 393x659', width: 393, height: 659 },
  { name: 'tab 402x681', width: 402, height: 681 },
  { name: 'home screen 390x844', width: 390, height: 844 },
  { name: 'home screen 393x852', width: 393, height: 852 },
  { name: 'home screen 402x874', width: 402, height: 874 },
  { name: 'small 375x667', width: 375, height: 667 },
  { name: 'small 375x548', width: 375, height: 548 },
  // Forced overflow: a screen far shorter than any phone, so lists that normally fit must scroll.
  { name: 'forced 390x420', width: 390, height: 420 },
];

const tapOpt = async (p: Page, kind: string): Promise<number> => {
  const g = await state(p);
  const i = (g.run?.reward?.options ?? []).findIndex((o) => o.type === kind);
  if (i < 0) throw new Error(`no ${kind} reward option`);
  return i;
};
const rewardWith = (kind: string) => (g: GameState) => g.run?.phase === 'reward' && (g.run.reward?.options ?? []).some((o) => o.type === kind);

const EXTRA: Scene[] = [
  {
    name: 'reward-face-sheet (replace a face)',
    setup: async (p) => {
      await replay(p, route('rw-face', () => pathTo('qa-rwface', rewardWith('face'))));
      await p.getByTestId(`reward-option-${await tapOpt(p, 'face')}`).tap();
      await expect(p.getByTestId('choose-face')).toBeVisible();
    },
  },
  {
    name: 'reward-upgrade-sheet (upgrade a face)',
    setup: async (p) => {
      await replay(p, route('rw-up', () => pathTo('qa-rwup', rewardWith('upgrade'))));
      await p.getByTestId(`reward-option-${await tapOpt(p, 'upgrade')}`).tap();
      await expect(p.getByTestId('choose-face')).toBeVisible();
    },
  },
  {
    name: 'reward-item-sheet (who carries it)',
    setup: async (p) => {
      await replay(p, route('rw-item', () => pathTo('qa-rwitem', rewardWith('item'))));
      await p.getByTestId(`reward-option-${await tapOpt(p, 'item')}`).tap();
      await expect(p.getByTestId('choose-hero')).toBeVisible();
    },
  },
  {
    name: 'reward-replace-item-sheet',
    setup: async (p) => {
      await replay(p, route('rw-item', () => pathTo('qa-rwitem', rewardWith('item'))));
      // Starting position edit: the first hero already carries a full set of items.
      const g = await state(p);
      const hero = g.run?.heroes[0];
      const slots = eng.content.heroes.find((h) => h.id === hero?.heroId)?.itemSlots ?? 2;
      const offered = g.run?.reward?.options.find((o) => o.type === 'item');
      const fill = eng.content.items.filter((i) => offered?.type !== 'item' || i.id !== offered.item).slice(0, slots).map((i) => i.id);
      if (hero) hero.items = fill;
      await openGame(p, g);
      await p.getByTestId(`reward-option-${await tapOpt(p, 'item')}`).tap();
      await p.getByTestId('place-hero-0').tap();
      await expect(p.getByTestId('choose-replace-item')).toBeVisible();
    },
  },
  {
    name: 'rest-upgrade-hero-sheet',
    setup: async (p) => {
      await goDoorThen(p, 'rest', 'rest');
      await p.getByTestId('btn-rest-upgrade').tap();
      await expect(p.getByTestId('choose-hero')).toBeVisible();
    },
  },
  {
    name: 'rest-upgrade-face-sheet',
    setup: async (p) => {
      await goDoorThen(p, 'rest', 'rest');
      await p.getByTestId('btn-rest-upgrade').tap();
      await p.getByTestId('place-hero-0').tap();
      await expect(p.getByTestId('choose-face')).toBeVisible();
    },
  },
  {
    name: 'shop-face-sheet',
    setup: async (p) => {
      await replay(p, route('shop-face', () => pathTo('qa-shopface', (g) => g.run?.phase === 'shop' && (g.run.shop?.slots ?? []).some((s) => s.type === 'face'), { door: 'shop' })));
      const g = await state(p);
      if (g.run) g.run.gold = 999; // starting position edit: enough gold to buy
      await openGame(p, g);
      const i = (g.run?.shop?.slots ?? []).findIndex((s) => s.type === 'face');
      await p.getByTestId(`shop-slot-${i}`).tap();
      await expect(p.getByTestId('choose-face')).toBeVisible();
    },
  },
];

/** Scene name -> the scroll containers the spec (TESTING.md) says it has; "a|b" = either one. */
const EXPECT: Record<string, string[]> = {
  'home-tutorial-offer': ['scroll-tutorial-offer'],
  'heroselect-fresh': ['scroll-heroselect'],
  'heroselect-all-unlocked-tiers': ['scroll-heroselect'],
  'heroselect-hero-info': ['scroll-info-hero-def'],
  'heroselect-locked-hero-info': ['scroll-info-hero-locked'],
  'fight-intent-sheet': ['scroll-info-intent'],
  'fight-menu': ['scroll-menu-modal'],
  reward: ['scroll-reward'],
  'reward-choose-sheet': ['scroll-choose-hero|scroll-choose-face'],
  treasure: ['scroll-reward'],
  doors: ['scroll-doors'],
  rest: ['scroll-rest'],
  shop: ['scroll-shop'],
  event: ['scroll-event'],
  'event-result': ['scroll-event'],
  victory: ['scroll-victory'],
  defeat: ['scroll-defeat'],
  'collection-heroes': ['scroll-collection'],
  'collection-items': ['scroll-collection'],
  'collection-enemies': ['scroll-collection'],
  'collection-fresh': ['scroll-collection'],
  feats: ['scroll-feats'],
  stats: ['scroll-stats'],
  daily: ['scroll-daily'],
  settings: ['scroll-settings'],
  'settings-confirm-reset': ['scroll-confirm-reset'],
  'fury-info-sheet': ['scroll-info-fury'],
  'boss-info-sheet': ['scroll-info-enemy'],
  'enemy-info-sheet': ['scroll-info-enemy'],
  'hero-info-sheet': ['scroll-info-hero'],
  'item-info-sheet': ['scroll-info-item'],
  'die-info-sheet': ['scroll-info-die'],
  'reward-face-sheet (replace a face)': ['scroll-choose-face'],
  'reward-upgrade-sheet (upgrade a face)': ['scroll-choose-face'],
  'reward-item-sheet (who carries it)': ['scroll-choose-hero'],
  'reward-replace-item-sheet': ['scroll-choose-replace-item'],
  'rest-upgrade-hero-sheet': ['scroll-choose-hero'],
  'rest-upgrade-face-sheet': ['scroll-choose-face'],
  'shop-face-sheet': ['scroll-choose-face'],
  // Fight and Home are laid out to fit: no container, but the page must still not scroll.
  home: [],
  'fight-rolling': [],
  'fight-four-enemies': [],
};

const byName = new Map(SCENES.map((s) => [s.name, s] as const));
/** Scenes that live on the fight screen cannot be laid out in 420 px of height; they are covered at the other sizes. */
const FIGHT_SCENE = /fight|boss|enemy|hero-info-sheet|item-info|die-info|fury/;
const AUDIT: Scene[] = [
  ...Object.keys(EXPECT)
    .filter((n) => !EXTRA.some((e) => e.name === n))
    .map((n) => {
      const s = byName.get(n);
      if (!s) throw new Error(`unknown scene ${n}`);
      return s;
    }),
  ...EXTRA,
];

/** Everything the spec asks of one screen: expected containers exist, each overflowing one scrolls properly. */
async function auditScene(page: Page, name: string): Promise<{ overflowing: string[] }> {
  const want = EXPECT[name] ?? [];
  const inDom = await allContainers(page);
  const present = await visibleContainers(page);
  for (const alt of want) {
    expect(
      alt.split('|').some((id) => inDom.includes(id)),
      `${name}: expected scroll container ${alt}; the screen has [${inDom.join(', ')}]`,
    ).toBe(true);
  }
  const overflowing: string[] = [];
  const seen = new Map<string, number>();
  for (const id of present) {
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    const r = await auditContainer(page, id, n);
    if (r.overflow) overflowing.push(id);
  }
  await expectPageStill(page, `at the end of ${name}`);
  return { overflowing };
}

for (const size of SIZES) {
  test.describe(`finger scrolling at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    for (const scene of AUDIT.filter((sc) => !(size.height < 500 && FIGHT_SCENE.test(sc.name)))) {
      test(scene.name, async ({ page }) => {
        test.setTimeout(45_000);
        const problems = watch(page);
        await openApp(page, { offerTutorial: scene.offerTutorial, ...(scene.rich ? { save: richSave() } : {}) });
        await scene.setup(page);
        await settle(page);
        await auditScene(page, scene.name);
        problems.assertClean();
      });
    }
  });
}

test.describe('forced overflow really scrolls', () => {
  test.use({ viewport: { width: 390, height: 420 } });
  for (const name of ['reward-face-sheet (replace a face)', 'rest-upgrade-face-sheet', 'settings', 'collection-heroes']) {
    test(`${name} overflows at 390x420 and is fully reachable by finger`, async ({ page }) => {
      const scene = AUDIT.find((s) => s.name === name);
      if (!scene) throw new Error(name);
      await openApp(page, { ...(scene.rich ? { save: richSave() } : {}) });
      await scene.setup(page);
      await settle(page);
      const { overflowing } = await auditScene(page, name);
      expect(overflowing.length, `${name}: at 390x420 at least one container must overflow, otherwise this test exercises nothing`).toBeGreaterThan(0);
    });
  }
});

test.describe('the 0.1.0 bug', () => {
  test.use({ viewport: { width: 390, height: 420 } });

  test('detector sees the 0.1.0 bug: with the old page-level touchmove blocker injected, the face sheet audit FAILS', async ({ page }) => {
    // 0.1.0 (src/ui/main.ts): document 'touchmove' listener, passive:false, preventDefault() unless
    // the touch starts inside `.scrollable`. The sheet body was not `.scrollable`, so a finger drag in
    // it was cancelled and Safari never scrolled it, while the mouse wheel still did. This test puts
    // that exact handler back into the current build and expects the audit to fail on it.
    await openApp(page);
    const scene = AUDIT.find((s) => s.name === 'reward-face-sheet (replace a face)');
    if (!scene) throw new Error('scene');
    await scene.setup(page);
    await settle(page);
    // Clean build first: the same audit passes.
    await auditContainer(page, 'scroll-choose-face');
    await page.evaluate(OLD_BUG_BLOCKER);
    await expect(auditContainer(page, 'scroll-choose-face')).rejects.toThrow(/touchmove cancelled by the page/);
    const d = await fingerDrag(page, '[data-testid="scroll-choose-face"]', 'up');
    expect(d.prevented, 'with the 0.1.0 handler every touchmove inside the sheet is cancelled').toBe(d.moves);
    // A wheel / scroll call is NOT affected by that handler: this is why a wheel-only test could never see the bug.
    const before = await page.getByTestId('scroll-choose-face').evaluate((el) => el.scrollTop);
    // (Playwright's mobile WebKit has no mouse wheel, so the same effect is made with a scroll call, which
    // the touch handler cannot cancel either.)
    await page.getByTestId('scroll-choose-face').evaluate((el) => el.scrollBy({ top: 120, behavior: 'instant' }));
    const after = await page.getByTestId('scroll-choose-face').evaluate((el) => el.scrollTop);
    expect(after, 'a wheel-style scroll still works under the old bug').toBeGreaterThan(before);
  });

  test('native touch (Chromium, real DevTools touch events): the face sheet scrolls by finger, and does not with the 0.1.0 handler', async () => {
    // WebKit on Windows cannot scroll from touch. Chromium can, from Input.dispatchTouchEvent, so this is
    // the one place a real finger scroll is measured: scrollTop must move with the fix and stay 0 with the old handler.
    const browser = await chromium.launch();
    try {
      for (const oldBug of [false, true]) {
        const context = await browser.newContext({ viewport: { width: 390, height: 420 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3, baseURL: `${ORIGIN}/pip-and-blade/` });
        const page = await context.newPage();
        await openApp(page);
        const scene = AUDIT.find((s) => s.name === 'reward-face-sheet (replace a face)');
        if (!scene) throw new Error('scene');
        await scene.setup(page);
        await settle(page);
        if (oldBug) await page.evaluate(OLD_BUG_BLOCKER);
        const sheet = page.getByTestId('scroll-choose-face');
        const box = await sheet.boundingBox();
        if (!box) throw new Error('no sheet');
        expect(await sheet.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(true);
        const cdp = await context.newCDPSession(page);
        const x = box.x + box.width / 2;
        const y0 = box.y + box.height - 20;
        const send = (type: string, y?: number): Promise<unknown> =>
          cdp.send('Input.dispatchTouchEvent', { type, touchPoints: y === undefined ? [] : [{ x, y }] } as never);
        await send('touchStart', y0);
        for (let i = 1; i <= 12; i++) {
          await send('touchMove', y0 - i * 12);
          await page.waitForTimeout(16); // a finger moves over time; the browser needs frames to scroll
        }
        await send('touchEnd');
        await page.waitForTimeout(300);
        const top = await sheet.evaluate((el) => el.scrollTop);
        const pageTop = await page.evaluate(() => (document.scrollingElement as HTMLElement).scrollTop);
        expect(pageTop, 'the page itself never scrolls').toBe(0);
        if (oldBug) expect(top, 'with the 0.1.0 handler a finger cannot scroll the sheet').toBe(0);
        else expect(top, 'a finger scrolls the sheet').toBeGreaterThan(20);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  });
});

test('the replace-a-face sheet end is reachable in a Safari tab, step by step', async ({ page }) => {
  // The owner's case in plain words: 390x664 Safari tab, reward "replace a face", every face of the hero
  // must be reachable by finger and tappable at the bottom.
  await page.setViewportSize({ width: 390, height: 664 });
  await openApp(page);
  const scene = AUDIT.find((s) => s.name === 'reward-face-sheet (replace a face)');
  if (!scene) throw new Error('scene');
  await scene.setup(page);
  await settle(page);
  const faces = await page.locator('[data-testid^="face-slot-"]').count();
  expect(faces, 'six faces listed').toBe(6);
  await auditContainer(page, 'scroll-choose-face');
  // The title and Cancel button stay pinned and on screen at all times.
  await expect(page.getByTestId('choose-face-cancel')).toBeInViewport();
  // Pick the very last face with a real tap after scrolling to it: it is accepted.
  await page.getByTestId('face-slot-5').scrollIntoViewIfNeeded();
  await page.getByTestId('face-slot-5').tap();
  await idle(page);
  await expectScreen(page, 'doors');
});
