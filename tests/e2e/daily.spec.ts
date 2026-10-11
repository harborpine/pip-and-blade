/** Acceptance 6: the daily run is identical on every retry, and the best result per day is tracked. */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameState } from '@shared';
import { eng, expectScreen, idle, openApp, state, watch } from './support/app';
import { DEFAULT_BOT, nextAction } from './support/bot';
import { perform } from './support/driver';

interface Snapshot {
  seed: string | undefined;
  heroes: string[];
  encounter: string | undefined;
  enemies: unknown;
  firstDice: unknown;
  rewardOptions: unknown;
  doors: unknown;
}

/** Play the first fight and its reward the same way (the bot is deterministic) and note what was offered. */
async function attempt(page: Page): Promise<{ snap: Snapshot; score: number }> {
  let g: GameState = await state(page);
  const run0 = g.run;
  const snap: Snapshot = {
    seed: run0?.seed,
    heroes: run0?.heroes.map((h) => h.heroId) ?? [],
    encounter: run0?.fight?.encounterId,
    enemies: run0?.fight?.enemies,
    firstDice: run0?.fight?.dice,
    rewardOptions: null,
    doors: null,
  };
  for (let i = 0; i < 80 && g.run?.phase === 'fight'; i++) g = await perform(page, g, nextAction(eng, g, DEFAULT_BOT));
  expect(g.run?.phase, 'the first fight of the daily is won').toBe('reward');
  snap.rewardOptions = g.run?.reward?.options;
  while (g.run?.phase === 'reward') g = await perform(page, g, nextAction(eng, g, DEFAULT_BOT));
  expect(g.run?.phase).toBe('doors');
  snap.doors = g.run?.doors;
  return { snap, score: g.run?.score ?? 0 };
}

/** Go into the next fight and abandon the run from its menu. */
async function abandonFromNextFight(page: Page): Promise<GameState> {
  let g = await state(page);
  g = await perform(page, g, { type: 'pickDoor', door: 0 });
  // Rest, shop and event doors come first: move through them until the next fight starts.
  for (let i = 0; i < 12 && g.run?.phase !== 'fight'; i++) g = await perform(page, g, nextAction(eng, g, DEFAULT_BOT));
  if (g.run?.phase !== 'fight') throw new Error(`expected a fight after the door, got ${g.run?.phase}`);
  await page.getByTestId('btn-menu').tap();
  await page.getByTestId('menu-abandon').tap();
  await page.getByTestId('confirm-abandon-confirm').tap();
  await idle(page);
  return state(page);
}

test('the daily run is identical on every try and the best result is kept', async ({ page }) => {
  test.setTimeout(300_000);
  const problems = watch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await page.getByTestId('btn-daily').tap();
  await expectScreen(page, 'daily');
  const date = (await page.getByTestId('daily-date').textContent()) ?? '';
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByTestId('daily-best')).toContainText('Not played yet');
  await page.getByTestId('btn-start-daily').tap();
  await idle(page);
  await expectScreen(page, 'fight');
  const start = await state(page);
  expect(start.run?.mode).toBe('daily');
  expect(start.run?.heroes.map((h) => h.heroId)).toEqual(eng.dailyHeroes(date));

  const first = await attempt(page);
  let g = await abandonFromNextFight(page);
  expect(g.run).toBeNull();
  expect(g.profile.daily[date]?.attempts).toBe(1);
  const best1 = g.profile.daily[date]?.bestScore ?? -1;
  expect(best1).toBeGreaterThanOrEqual(first.score);

  await expectScreen(page, 'home');
  await page.getByTestId('btn-daily').tap();
  await expect(page.getByTestId('daily-best')).toContainText('1 attempt');
  await page.getByTestId('btn-start-daily').tap();
  await idle(page);
  await expectScreen(page, 'fight');
  const second = await attempt(page);
  expect(second.snap, 'identical heroes, first fight, dice, reward options and doors on a retry').toEqual(first.snap);
  g = await abandonFromNextFight(page);
  const rec = g.profile.daily[date];
  expect(rec?.attempts).toBe(2);
  expect(rec?.bestScore, 'best result of the day is the better of the two tries').toBeGreaterThanOrEqual(Math.max(first.score, second.score));
  await page.getByTestId('btn-daily').tap();
  await expect(page.getByTestId('daily-best')).toContainText('2 attempts');
  await expect(page.getByTestId(`daily-${date}`)).toBeVisible();
  problems.assertClean();
});
