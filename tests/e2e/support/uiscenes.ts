/**
 * Named screen scenes shared by the screens spec (layout + screenshots) and the scrolling spec.
 * Each scene gets the page from a fresh app (optionally with a rich profile) to one screen / sheet.
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { eng, expectScreen, idle, state } from './app';
import { perform } from './driver';
import { pathTo, replay } from './reach';
import type { Path } from './reach';
import { WINNING_SEED } from '../pinned';
import { openFourEnemies, openFury } from './fury';
import { blankShowing, bossOfAct, cursedShowing, heroHasItem, jammedDie, trickIntent, turnStart } from './scenes';
import type { GameState, HeroId } from '@shared';

export interface Scene {
  name: string;
  setup: (page: Page) => Promise<void>;
  rich?: boolean;
  offerTutorial?: boolean;
  /** Leave interface prefs untouched (shows the one-time install tip). */
  freshPrefs?: boolean;
  expectScreen?: string;
}

// Safari-tab sizes (390x664, 393x659, 402x681), Home Screen sizes (390x844, 393x852, 402x874) and the
// small iPhone (375x667). PNGs are kept for the two main sizes only (the visual record).
export const inPhase = (phase: string) => (g: GameState) => g.run?.phase === phase;
export const doorKind = (kind: string) => (g: GameState) => g.run?.phase === 'doors' && (g.run.doors ?? []).some((d) => d.kind === kind);

export const paths = new Map<string, Path>();
export function route(key: string, build: () => Path): Path {
  let p = paths.get(key);
  if (!p) {
    p = build();
    paths.set(key, p);
  }
  return p;
}

export async function goDoorThen(page: Page, kind: string, phase: string): Promise<void> {
  // Replay up to the doors offering this kind, then take that door.
  const p = route(`door-${kind}`, () => pathTo('qa-door-' + kind, doorKind(kind), { door: kind as never }));
  await replay(page, p);
  const g = await state(page);
  const idx = (g.run?.doors ?? []).findIndex((d) => d.kind === kind);
  await page.evaluate((i) => (window as unknown as { __pip: { dispatch(a: unknown): void } }).__pip.dispatch({ type: 'pickDoor', door: i }), idx);
  await idle(page);
  expect((await state(page)).run?.phase, `door ${kind} should lead to ${phase}`).toBe(phase);
}

export const SCENES: Scene[] = [
  { name: 'home', setup: async (p) => expectScreen(p, 'home'), expectScreen: 'home' },
  {
    name: 'home-install-tip',
    freshPrefs: true,
    setup: async (p) => {
      await expect(p.getByTestId('install-tip')).toBeVisible();
    },
  },
  {
    name: 'fight-rolling-over',
    setup: async (p) => {
      await replay(p, { seed: 'qa-shot', heroes: richParty(), actions: [] });
      const g = await state(p);
      const dv = eng.dice(g).find((d) => d.usable && d.effect !== 'blank' && (!d.needsTarget || d.targets.length === 1));
      if (!dv) throw new Error('no direct die');
      await perform(p, g, dv.needsTarget && dv.targets[0] ? { type: 'useDie', die: dv.die, target: dv.targets[0] } : { type: 'useDie', die: dv.die });
      await expect(p.getByTestId('btn-reroll')).toHaveAttribute('data-state', 'over');
    },
  },
  {
    name: 'shot-reward-replace-face-sheet',
    setup: async (p) => {
      await replay(p, route('rw-face', () => pathTo('qa-rwface', (g) => g.run?.phase === 'reward' && (g.run.reward?.options ?? []).some((o) => o.type === 'face'))));
      const g = await state(p);
      const i = (g.run?.reward?.options ?? []).findIndex((o) => o.type === 'face');
      await p.getByTestId('reward-option-' + String(i)).tap();
      await expect(p.getByTestId('choose-face')).toBeVisible();
    },
  },
  {
    name: 'shot-rest-upgrade-face-sheet',
    setup: async (p) => {
      await goDoorThen(p, 'rest', 'rest');
      await p.getByTestId('btn-rest-upgrade').tap();
      await p.getByTestId('place-hero-0').tap();
      await expect(p.getByTestId('choose-face')).toBeVisible();
    },
  },
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
      await p.getByTestId('lock-0').tap();
      await p.getByTestId('lock-2').tap();
      await idle(p);
      await expect(p.getByTestId('die-0')).toHaveAttribute('data-locked', 'true');
    },
  },
  {
    name: 'fight-targeting',
    setup: async (p) => {
      // a die with several targets: tapping it lifts it and shows the previews
      await replay(p, route('multi', () => pathTo('qa-multi', (g) => turnStart(g) && eng.dice(g).some((d) => d.usable && d.needsTarget && d.targets.length > 1))));
      const g = await state(p);
      const di = eng.dice(g).find((d) => d.usable && d.needsTarget && d.targets.length > 1)?.die ?? 0;
      await p.getByTestId(`die-${di}`).tap();
      await expect(p.getByTestId(`die-${di}`)).toHaveClass(/selected/);
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

export function richParty(): [HeroId, HeroId, HeroId] {
  return eng.content.heroes.filter((h) => h.starter).slice(0, 3).map((h) => h.id) as [HeroId, HeroId, HeroId];
}

async function replayShot(p: Page): Promise<void> {
  await replay(p, { seed: 'qa-shot', heroes: richParty(), actions: [] });
  // Use the first usable die by tapping (one tap, or die then target).
  const g = await state(p);
  const dv = eng.dice(g).find((d) => d.usable && d.effect !== 'blank');
  if (!dv) return;
  const t = dv.needsTarget ? dv.targets[0] : undefined;
  await perform(p, g, t ? { type: 'useDie', die: dv.die, target: t } : { type: 'useDie', die: dv.die });
}

