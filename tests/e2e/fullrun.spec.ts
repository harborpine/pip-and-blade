/**
 * Acceptance 2 and 3: one full winning run (all 3 acts, 12 fights, 3 bosses) and one losing run,
 * played with real taps. The bot (support/bot.ts) decides; every decision is performed by tapping
 * the real controls, and after every tap the app's state must equal what the rules engine predicts.
 *
 * The winning run starts from a pinned seed (hero select cannot take a seed, so the run is started
 * through the debug hook; hero select itself is tested separately below). Motion is reduced so the
 * ~300 taps run quickly; animations are covered by the other specs.
 */
import { expect, test } from '@playwright/test';
import { WINNING_SEED } from './pinned';
import { PARTY, expectScreen, idle, openApp, startRun, state, watch, eng } from './support/app';
import { DEFAULT_BOT, nextAction } from './support/bot';
import { perform } from './support/driver';
import { playHeadless } from './support/headless';

test('hero select: pick three heroes by tapping and start a run', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await page.getByTestId('btn-new-run').tap();
  await expectScreen(page, 'heroselect');
  await expect(page.getByTestId('party-count')).toContainText('3/3');
  // Swap the third hero out and back in.
  await page.getByTestId(`hero-pick-${PARTY[2]}`).tap();
  await expect(page.getByTestId('party-count')).toContainText('2/3');
  await expect(page.getByTestId('btn-start-run')).toBeDisabled();
  await page.getByTestId(`hero-pick-${PARTY[2]}`).tap();
  await expect(page.getByTestId('btn-start-run')).toBeEnabled();
  // A locked hero cannot be picked.
  const locked = eng.content.heroes.find((h) => !h.starter);
  if (locked) {
    await page.getByTestId(`hero-pick-${locked.id}`).tap();
    await expect(page.getByTestId('party-count')).toContainText('3/3');
    await expect(page.getByTestId(`hero-pick-${locked.id}`)).toHaveAttribute('aria-pressed', 'false');
  }
  await page.getByTestId('btn-start-run').tap();
  await idle(page);
  await expectScreen(page, 'fight');
  const g = await state(page);
  expect(g.run?.heroes.map((h) => h.heroId)).toEqual(PARTY);
  expect(g.run?.mode).toBe('standard');
  problems.assertClean();
});

test('a full winning run: 3 acts, 12 fights, 3 bosses, through every kind of screen', async ({ page }) => {
  test.setTimeout(900_000);
  const head = playHeadless(PARTY, WINNING_SEED);
  expect(head.won, `pinned seed ${WINNING_SEED} no longer wins headless: re-pin it with tests/e2e/support/find-seed.ts (see tests/e2e/pinned.ts)`).toBe(true);

  const problems = watch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await startRun(page, WINNING_SEED);
  let g = await state(page);
  const phases = new Set<string>();
  const bosses = new Set<string>();
  const screens = new Set<string>();
  const acts = new Set<number>();
  for (let i = 0; i < 3000 && g.run && g.run.phase !== 'victory'; i++) {
    expect(g.run.phase, `run lost at fight ${g.run.fightsWon + 1} (act ${g.run.act}) with the pinned seed`).not.toBe('defeat');
    phases.add(g.run.phase);
    acts.add(g.run.act);
    if (g.run.fight?.kind === 'boss') bosses.add(`${g.run.act}:${g.run.fight.encounterId}`);
    g = await perform(page, g, nextAction(eng, g, DEFAULT_BOT));
    screens.add(await page.evaluate(() => document.body.dataset['screen'] ?? ''));
  }
  await expectScreen(page, 'victory');
  expect(g.run?.phase).toBe('victory');
  expect(g.run?.fightsWon).toBe(12);
  expect([...acts].sort()).toEqual([1, 2, 3]);
  expect(bosses.size, 'three different boss fights').toBe(3);
  for (const p of ['fight', 'reward', 'doors', 'rest', 'shop', 'event']) expect([...phases], `visited ${p}`).toContain(p);
  for (const s of ['fight', 'reward', 'doors', 'rest', 'shop', 'event']) expect([...screens], `showed screen ${s}`).toContain(s);
  await expect(page.getByTestId('end-title')).toHaveText('Victory!');
  await page.getByTestId('btn-continue').tap();
  await expectScreen(page, 'home');
  g = await state(page);
  expect(g.run).toBeNull();
  expect(g.profile.stats.runsPlayed).toBe(1);
  expect(g.profile.stats.runsWon).toBe(1);
  expect(g.profile.stats.winStreak).toBe(1);
  expect(g.profile.maxTier, 'the first win unlocks tier 1').toBeGreaterThanOrEqual(1);
  await page.getByTestId('btn-stats').tap();
  await expect(page.getByTestId('stat-wins-value')).toHaveText('1');
  await expect(page.getByTestId('stat-runs-value')).toHaveText('1');
  problems.assertClean();
});

test('a losing run: ending turns without using dice reaches the Defeat screen and the loss is recorded', async ({ page }) => {
  test.setTimeout(300_000);
  const problems = watch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await startRun(page, 'qa-lose');
  let g = await state(page);
  for (let i = 0; i < 200 && g.run?.phase === 'fight'; i++) g = await perform(page, g, { type: 'endTurn' });
  await expectScreen(page, 'defeat');
  await expect(page.getByTestId('end-title')).toHaveText('Defeated');
  expect(g.run?.phase).toBe('defeat');
  expect(g.run?.heroes.every((h) => h.downed)).toBe(true);
  await page.getByTestId('btn-continue').tap();
  await expectScreen(page, 'home');
  g = await state(page);
  expect(g.run).toBeNull();
  expect(g.profile.stats.runsPlayed).toBe(1);
  expect(g.profile.stats.runsWon).toBe(0);
  expect(g.profile.stats.winStreak).toBe(0);
  await page.getByTestId('btn-stats').tap();
  await expect(page.getByTestId('stat-runs-value')).toHaveText('1');
  await expect(page.getByTestId('stat-wins-value')).toHaveText('0');
  await expect(page.getByTestId('stat-winrate-value')).toHaveText('0%');
  problems.assertClean();
});
