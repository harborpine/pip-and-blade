/**
 * The owner's saved progress must survive the update: tests/fixtures/save-v0.1.0.json was written
 * by the 0.1.0 code (mid-fight, 4 runs of history, 3 feats, 5 heroes unlocked). It is loaded two
 * ways (placed in storage exactly as 0.1.0 stored it, and through Settings > Import) and must
 * resume that exact fight and stay playable.
 */
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { GameState, SaveFile } from '@shared';
import { eng, expectScreen, idle, saveFile, state, waitBooted, watch } from './support/app';
import { DEFAULT_BOT, nextAction } from './support/bot';
import { perform } from './support/driver';

const FIXTURE = path.resolve('tests', 'fixtures', 'save-v0.1.0.json');
const text = fs.readFileSync(FIXTURE, 'utf8');
const fixture = JSON.parse(text) as SaveFile;

test('the fixture really is a 0.1.0 mid-fight save with history', () => {
  expect(fixture.version).toBe(1);
  expect(fixture.game.run?.phase).toBe('fight');
  expect(fixture.game.run?.fight?.diceUsed, 'a die was already used this turn').toBeGreaterThan(0);
  expect(fixture.game.profile.stats.runsPlayed).toBe(4);
  expect(fixture.game.profile.featsDone).toHaveLength(3);
  expect(fixture.game.profile.unlockedHeroes).toHaveLength(5);
  // The current engine accepts it as it is.
  expect(eng.load(text).game).toEqual(fixture.game);
});

test('0.1.0 save placed in storage the way 0.1.0 kept it: the app resumes that exact fight with history intact and plays on', async ({ page }) => {
  test.setTimeout(180_000);
  const problems = watch(page);
  await page.addInitScript((t) => {
    try {
      if (!localStorage.getItem('pip-and-blade.save')) { localStorage.setItem('pip-and-blade.save', JSON.stringify({ t: 1, text: t })); localStorage.setItem('pip-and-blade.tutorialOffered', '1'); }
    } catch {
      /* ignore */
    }
  }, text);
  await page.goto('./');
  await waitBooted(page);
  await expectScreen(page, 'fight');

  const g = await state(page);
  expect(g, 'the game after the update equals the game that was saved').toEqual(fixture.game);
  expect(g.profile.stats.runsPlayed).toBe(4);
  expect(g.profile.featsDone).toEqual(fixture.game.profile.featsDone);
  expect(g.profile.unlockedHeroes).toEqual(fixture.game.profile.unlockedHeroes);
  expect((await saveFile(page)).settings.reduceMotion, 'the old setting is kept').toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  // New 0.2.0 interface settings default safely when absent from an old save.
  await expect(page.getByTestId('install-tip')).toHaveCount(0);

  // The fight can be continued: use dice, end the turn, with every step matching the rules engine.
  let cur: GameState = g;
  const turn = g.run?.fight?.turn ?? 0;
  for (let i = 0; i < 30 && cur.run?.phase === 'fight'; i++) {
    const a = nextAction(eng, cur, DEFAULT_BOT);
    cur = await perform(page, cur, a);
    if (a.type === 'endTurn') break;
  }
  expect(cur.run?.fight?.turn !== turn || cur.run?.phase !== 'fight', 'the turn was played to its end').toBe(true);

  // History survives play: leave the run and look at the numbers.
  await page.reload();
  await waitBooted(page);
  expect((await state(page)).profile.featsDone).toEqual(fixture.game.profile.featsDone);
  await page.getByTestId('btn-menu').tap();
  await page.getByTestId('menu-abandon').tap();
  await page.getByTestId('confirm-abandon-confirm').tap();
  await idle(page);
  await expectScreen(page, 'home');
  await page.getByTestId('btn-feats').tap();
  await expect(page.getByTestId('feats-count')).toContainText('3');
  await page.getByTestId('btn-back').tap();
  await page.getByTestId('btn-stats').tap();
  const runs = (await state(page)).profile.stats.runsPlayed;
  expect(runs).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('stat-runs-value')).toHaveText(String(runs));
  problems.assertClean();
});

test('the same 0.1.0 save imported through Settings resumes the exact fight', async ({ page }) => {
  const problems = watch(page);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('pip-and-blade.tutorialOffered', '1');
      localStorage.setItem('pip-and-blade.prefs', JSON.stringify({ installTipDismissed: true }));
    } catch {
      /* ignore */
    }
  });
  await page.goto('./');
  await waitBooted(page);
  await expectScreen(page, 'home');
  await page.getByTestId('btn-settings').tap();
  await page.getByTestId('input-import').setInputFiles(FIXTURE);
  await expect(page.getByTestId('confirm-import')).toBeVisible();
  await page.getByTestId('confirm-import-confirm').tap();
  await idle(page);
  await expectScreen(page, 'fight');
  expect(await state(page), 'imported 0.1.0 game equals the file').toEqual(fixture.game);
  // And it keeps working after a reload (it was saved).
  await page.reload();
  await waitBooted(page);
  await expectScreen(page, 'fight');
  expect(await state(page)).toEqual(fixture.game);
  const g = await state(page);
  await perform(page, g, nextAction(eng, g, DEFAULT_BOT));
  problems.assertClean();
});
