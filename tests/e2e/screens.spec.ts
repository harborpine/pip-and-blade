/**
 * Every screen, at 390x844 (iPhone 14) and 375x667 (small iPhone):
 *  - iPhone layout rules (no page scroll, 44px targets, nothing off-screen or overlapping,
 *    fight controls in the lower half), no console errors, no failed requests;
 *  - with PIP_UPDATE_SCREENSHOTS=1 set, a PNG of each screen is written to tests/e2e/screenshots/<size>/
 *    (the visual record). A normal run writes no files, so the working tree stays clean.
 * Landscape shows the rotate overlay.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import path from 'node:path';

const UPDATE_SHOTS = process.env['PIP_UPDATE_SCREENSHOTS'] === '1';
import { eng, expectScreen, idle, openApp, richSave, settle, state, watch } from './support/app';
import { layoutIssues } from './support/layout';
import { pathTo, replay } from './support/reach';
import type { Path } from './support/reach';
import { WINNING_SEED } from './pinned';
import { openFourEnemies, openFury } from './support/fury';
import { blankShowing, bossOfAct, cursedShowing, heroHasItem, jammedDie, trickIntent, turnStart } from './support/scenes';
import type { GameState, HeroId } from '@shared';

interface Scene {
  name: string;
  setup: (page: Page) => Promise<void>;
  rich?: boolean;
  offerTutorial?: boolean;
  expectScreen?: string;
}

const SIZES = [
  { dir: '390x844', width: 390, height: 844, shot: true },
  { dir: '375x667', width: 375, height: 667, shot: true },
  // The size the iPhone 14 test profile really has (Safari bars removed): layout rules only, no PNG.
  { dir: '390x664', width: 390, height: 664, shot: false },
];

const inPhase = (phase: string) => (g: GameState) => g.run?.phase === phase;
const doorKind = (kind: string) => (g: GameState) => g.run?.phase === 'doors' && (g.run.doors ?? []).some((d) => d.kind === kind);

const paths = new Map<string, Path>();
function route(key: string, build: () => Path): Path {
  let p = paths.get(key);
  if (!p) {
    p = build();
    paths.set(key, p);
  }
  return p;
}

async function goDoorThen(page: Page, kind: string, phase: string): Promise<void> {
  // Replay up to the doors offering this kind, then take that door.
  const p = route(`door-${kind}`, () => pathTo('qa-door-' + kind, doorKind(kind), { door: kind as never }));
  await replay(page, p);
  const g = await state(page);
  const idx = (g.run?.doors ?? []).findIndex((d) => d.kind === kind);
  await page.evaluate((i) => (window as unknown as { __pip: { dispatch(a: unknown): void } }).__pip.dispatch({ type: 'pickDoor', door: i }), idx);
  await idle(page);
  expect((await state(page)).run?.phase, `door ${kind} should lead to ${phase}`).toBe(phase);
}

const SCENES: Scene[] = [
  { name: 'home', setup: async (p) => expectScreen(p, 'home'), expectScreen: 'home' },
  {
    name: 'home-tutorial-offer',
    offerTutorial: true,
    setup: async (p) => {
      await expect(p.getByTestId('tutorial-offer')).toBeVisible();
    },
  },
  {
    name: 'heroselect-fresh',
    setup: async (p) => {
      await p.getByTestId('btn-new-run').tap();
      await expectScreen(p, 'heroselect');
    },
  },
  {
    name: 'heroselect-all-unlocked-tiers',
    rich: true,
    setup: async (p) => {
      await p.getByTestId('btn-new-run').tap();
      await expectScreen(p, 'heroselect');
      await expect(p.getByTestId('tier-picker')).toBeVisible();
    },
  },
  {
    name: 'fight-rolling',
    setup: async (p) => {
      await replay(p, { seed: 'qa-shot', heroes: richParty(), actions: [] });
      await expectScreen(p, 'fight');
    },
  },
  {
    name: 'fight-dice-locked',
    setup: async (p) => {
      await replay(p, { seed: 'qa-shot', heroes: richParty(), actions: [] });
      await p.getByTestId('die-0').tap();
      await idle(p);
      await expect(p.getByTestId('die-0')).toHaveAttribute('data-locked', 'true');
    },
  },
  {
    name: 'fight-targeting',
    setup: async (p) => {
      await replay(p, { seed: 'qa-shot', heroes: richParty(), actions: [] });
      await p.getByTestId('btn-use-dice').tap();
      await p.getByTestId('die-0').tap();
      await idle(p);
    },
  },
  {
    name: 'fight-after-use',
    setup: async (p) => replayShot(p),
  },
  {
    name: 'fight-intent-sheet',
    setup: async (p) => {
      await replay(p, { seed: 'qa-shot', heroes: richParty(), actions: [] });
      const g = await state(p);
      await p.getByTestId(`intent-${g.run?.fight?.enemies[0]?.uid}`).tap();
      await expect(p.getByTestId('info-sheet').or(p.getByTestId('info-intent'))).toBeVisible();
    },
  },
  {
    name: 'fight-menu',
    setup: async (p) => {
      await replay(p, { seed: 'qa-shot', heroes: richParty(), actions: [] });
      await p.getByTestId('btn-menu').tap();
      await expect(p.getByTestId('menu-modal')).toBeVisible();
    },
  },
  {
    name: 'fight-boss',
    setup: async (p) => {
      await replay(p, route('boss', () => pathTo('qa-boss', (g) => g.run?.phase === 'fight' && g.run.fight?.kind === 'boss')));
      expect((await state(p)).run?.fight?.kind).toBe('boss');
    },
  },
  {
    name: 'fight-elite',
    setup: async (p) => {
      await replay(p, route('elite', () => pathTo('qa-elite', (g) => g.run?.phase === 'fight' && g.run.fight?.kind === 'elite', { door: 'elite' })));
      expect((await state(p)).run?.fight?.kind).toBe('elite');
    },
  },
  {
    name: 'fight-tutorial',
    setup: async (p) => {
      await p.evaluate(() => (window as unknown as { __pip: { dispatch(a: unknown): void } }).__pip.dispatch({ type: 'startTutorial' }));
      await idle(p);
      await expect(p.getByTestId('tutorial-card')).toBeVisible();
    },
  },
  {
    name: 'reward',
    setup: async (p) => {
      await replay(p, route('reward', () => pathTo('qa-reward', inPhase('reward'))));
      await expectScreen(p, 'reward');
    },
  },
  {
    name: 'reward-choose-sheet',
    setup: async (p) => {
      await replay(p, route('reward', () => pathTo('qa-reward', inPhase('reward'))));
      await p.getByTestId('reward-option-0').tap();
      await expect(p.getByTestId('choose-hero').or(p.getByTestId('choose-face'))).toBeVisible();
    },
  },
  {
    name: 'doors',
    setup: async (p) => {
      await replay(p, route('doors', () => pathTo('qa-doors', inPhase('doors'))));
      await expectScreen(p, 'doors');
    },
  },
  { name: 'rest', setup: async (p) => goDoorThen(p, 'rest', 'rest') },
  { name: 'shop', setup: async (p) => goDoorThen(p, 'shop', 'shop') },
  { name: 'event', setup: async (p) => goDoorThen(p, 'event', 'event') },
  {
    name: 'event-result',
    setup: async (p) => {
      await goDoorThen(p, 'event', 'event');
      await p.getByTestId('event-choice-0').tap();
      await idle(p);
    },
  },
  { name: 'treasure', setup: async (p) => goDoorThen(p, 'treasure', 'reward') },
  {
    name: 'victory',
    setup: async (p) => {
      await replay(p, route('win', () => pathTo('win', inPhase('victory'), { seeds: [WINNING_SEED] })));
      await expectScreen(p, 'victory');
    },
  },
  {
    name: 'defeat',
    setup: async (p) => {
      await replay(p, { seed: 'qa-lose', heroes: richParty(), actions: [] });
      for (let i = 0; i < 60; i++) {
        const g = await state(p);
        if (g.run?.phase === 'defeat') break;
        await p.evaluate(() => (window as unknown as { __pip: { dispatch(a: unknown): void } }).__pip.dispatch({ type: 'endTurn' }));
      }
      await idle(p);
      await expectScreen(p, 'defeat');
    },
  },
  {
    name: 'collection-heroes',
    rich: true,
    setup: async (p) => {
      await p.getByTestId('btn-collection').tap();
      await expectScreen(p, 'collection');
    },
  },
  {
    name: 'collection-items',
    rich: true,
    setup: async (p) => {
      await p.getByTestId('btn-collection').tap();
      await p.getByTestId('tab-items').tap();
      await expect(p.getByTestId('coll-count')).toContainText('Seen');
    },
  },
  {
    name: 'collection-enemies',
    rich: true,
    setup: async (p) => {
      await p.getByTestId('btn-collection').tap();
      await p.getByTestId('tab-enemies').tap();
      await expect(p.getByTestId('coll-count')).toContainText('Seen');
    },
  },
  {
    name: 'collection-fresh',
    setup: async (p) => {
      await p.getByTestId('btn-collection').tap();
      await p.getByTestId('tab-items').tap();
    },
  },
  {
    name: 'feats',
    rich: true,
    setup: async (p) => {
      await p.getByTestId('btn-feats').tap();
      await expectScreen(p, 'feats');
    },
  },
  {
    name: 'stats',
    rich: true,
    setup: async (p) => {
      await p.getByTestId('btn-stats').tap();
      await expectScreen(p, 'stats');
    },
  },
  {
    name: 'daily',
    rich: true,
    setup: async (p) => {
      await p.getByTestId('btn-daily').tap();
      await expectScreen(p, 'daily');
    },
  },
  {
    name: 'settings',
    setup: async (p) => {
      await p.getByTestId('btn-settings').tap();
      await expectScreen(p, 'settings');
    },
  },
  {
    name: 'settings-confirm-reset',
    setup: async (p) => {
      await p.getByTestId('btn-settings').tap();
      await p.getByTestId('btn-reset').tap();
      await expect(p.getByTestId('confirm-reset')).toBeVisible();
    },
  },
  {
    name: 'fury-badge-soon',
    setup: async (p) => {
      await openFury(p, 11);
      await expect(p.getByTestId('fury-badge')).toHaveText('Fury next turn');
    },
  },
  {
    name: 'fury-badge-active',
    setup: async (p) => {
      await openFury(p, 12);
      await expect(p.getByTestId('fury-badge')).toHaveText('FURY');
    },
  },
  {
    name: 'fury-info-sheet',
    setup: async (p) => {
      await openFury(p, 12);
      await p.getByTestId('fury-badge').tap();
      await expect(p.getByTestId('info-fury')).toBeVisible();
    },
  },
  { name: 'fight-jammed-die', setup: async (p) => replay(p, route('jam', () => pathTo('qa-jam', jammedDie))) },
  { name: 'fight-cursed-face', setup: async (p) => replay(p, route('curse', () => pathTo('qa-curse', cursedShowing))) },
  { name: 'fight-blank-face', setup: async (p) => replay(p, route('blank', () => pathTo('qa-blank', blankShowing))) },
  { name: 'fight-intent-lock-die', setup: async (p) => replay(p, route('t-lock', () => pathTo('qa-tlock', trickIntent('lockDie')))) },
  { name: 'fight-intent-curse-face', setup: async (p) => replay(p, route('t-curse', () => pathTo('qa-tcurse', trickIntent('curseFace')))) },
  { name: 'fight-intent-steal-reroll', setup: async (p) => replay(p, route('t-steal', () => pathTo('qa-tsteal', trickIntent('stealReroll')))) },
  { name: 'fight-four-enemies', setup: async (p) => openFourEnemies(p) },
  ...[1, 2, 3].map((act) => ({
    name: `fight-boss-act${act}`,
    setup: async (p: Page) => {
      await replay(p, route(`boss${act}`, () => pathTo('win', bossOfAct(act), { seeds: [WINNING_SEED] })));
      expect((await state(p)).run?.fight?.kind).toBe('boss');
    },
  })),
  {
    name: 'boss-info-sheet',
    setup: async (p) => {
      await replay(p, route('boss1', () => pathTo('win', bossOfAct(1), { seeds: [WINNING_SEED] })));
      const g = await state(p);
      await p.getByTestId(`enemy-${g.run?.fight?.enemies[0]?.uid}`).tap();
      await expect(p.getByTestId('info-enemy')).toBeVisible();
    },
  },
  {
    name: 'enemy-info-sheet',
    setup: async (p) => {
      await replay(p, { seed: 'qa-shot', heroes: richParty(), actions: [] });
      const g = await state(p);
      await p.getByTestId(`enemy-${g.run?.fight?.enemies[0]?.uid}`).tap();
      await expect(p.getByTestId('info-enemy')).toBeVisible();
    },
  },
  {
    name: 'hero-info-sheet',
    setup: async (p) => {
      await replay(p, { seed: 'qa-shot', heroes: richParty(), actions: [] });
      await p.getByTestId('hero-0').tap();
      await expect(p.getByTestId('info-hero')).toBeVisible();
    },
  },
  {
    name: 'item-info-sheet',
    setup: async (p) => {
      await replay(p, route('items', () => pathTo('qa-items', heroHasItem)));
      const g = await state(p);
      const i = g.run?.heroes.findIndex((h) => h.items.length > 0) ?? 0;
      await p.getByTestId(`hero-items-${i}`).locator('> *').first().tap();
      await expect(p.getByTestId('info-item')).toBeVisible();
    },
  },
  {
    name: 'die-info-sheet',
    setup: async (p) => {
      await replay(p, { seed: 'qa-shot', heroes: richParty(), actions: [] });
      const box = await p.getByTestId('die-0').boundingBox();
      if (!box) throw new Error('no die');
      await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await p.mouse.down();
      await p.waitForTimeout(700); // a long press is a held finger: the hold time is what is tested
      await p.mouse.up();
      await expect(p.getByTestId('info-die')).toBeVisible();
    },
  },
  {
    name: 'heroselect-hero-info',
    setup: async (p) => {
      await p.getByTestId('btn-new-run').tap();
      await p.getByTestId(`hero-info-${richParty()[0]}`).tap();
      await expect(p.getByTestId('info-hero-def')).toBeVisible();
    },
  },
  {
    name: 'heroselect-locked-hero-info',
    setup: async (p) => {
      await p.getByTestId('btn-new-run').tap();
      const locked = eng.content.heroes.find((h) => !h.starter);
      await p.getByTestId(`hero-info-${locked?.id}`).tap();
      await expect(p.getByTestId('info-hero-locked')).toBeVisible();
    },
  },
  {
    name: 'fight-later-turn',
    setup: async (p) => replay(p, route('turnstart', () => pathTo('qa-ts', (g) => turnStart(g) && (g.run?.fight?.turn ?? 0) >= 2))),
  },
];

function richParty(): [HeroId, HeroId, HeroId] {
  return eng.content.heroes.filter((h) => h.starter).slice(0, 3).map((h) => h.id) as [HeroId, HeroId, HeroId];
}

async function replayShot(p: Page): Promise<void> {
  await replay(p, { seed: 'qa-shot', heroes: richParty(), actions: [] });
  // Use the first usable die on its first target by tapping.
  await p.getByTestId('btn-use-dice').tap();
  const g = await state(p);
  const dv = eng.dice(g).find((d) => d.usable);
  if (!dv) return;
  await p.getByTestId(`die-${dv.die}`).tap();
  if (dv.needsTarget && dv.targets[0]) {
    const t = dv.targets[0];
    await p.getByTestId(t.side === 'enemy' ? `enemy-${t.uid}` : `hero-${t.index}`).tap();
  } else {
    await p.getByTestId(`die-${dv.die}`).tap();
  }
  await idle(p);
}

for (const size of SIZES) {
  test.describe(`screens at ${size.dir}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    for (const scene of SCENES) {
      test(`${scene.name}`, async ({ page }) => {
        const problems = watch(page);
        await openApp(page, { offerTutorial: scene.offerTutorial, ...(scene.rich ? { save: richSave() } : {}) });
        await scene.setup(page);
        await settle(page);
        if (size.shot && UPDATE_SHOTS) await page.screenshot({ path: path.resolve('tests', 'e2e', 'screenshots', size.dir, `${scene.name}.png`), scale: 'css' });
        const issues = await layoutIssues(page);
        expect(issues, `layout problems on ${scene.name} at ${size.dir}`).toEqual([]);
        problems.assertClean();
      });
    }
  });
}

test.describe('landscape', () => {
  test.use({ viewport: { width: 844, height: 390 } });
  test('shows the rotate-back-to-portrait overlay', async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId('rotate-overlay')).toBeVisible();
    if (UPDATE_SHOTS) await page.screenshot({ path: path.resolve('tests', 'e2e', 'screenshots', 'landscape-rotate.png'), scale: 'css' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload(); // WebKit only re-evaluates media queries on load
    await expect(page.getByTestId('rotate-overlay')).toBeHidden();
  });
});

