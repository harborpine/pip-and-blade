/**
 * The owner's saved progress must survive every update. Two fixtures, each written by the released code of
 * its version (lead-made, mid-fight with history):
 *   tests/fixtures/save-v0.1.0.json (4 runs, 3 feats, 5 heroes) and tests/fixtures/save-v0.2.0.json (4 runs, 6 feats, 5 heroes).
 * Each is loaded two ways (placed in storage exactly as that version stored it, and through Settings > Import) and
 * must resume that exact fight (deep-equal) and stay playable.
 */
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { GameState, SaveFile } from '@shared';
import { eng, expectScreen, idle, saveFile, state, waitBooted, watch } from './support/app';
import { DEFAULT_BOT, nextAction } from './support/bot';
import { perform } from './support/driver';

const VERSIONS = [
  { v: '0.1.0', file: 'save-v0.1.0.json', runs: 4, feats: 3, heroes: 5 },
  { v: '0.2.0', file: 'save-v0.2.0.json', runs: 4, feats: 6, heroes: 5 },
] as const;

for (const ver of VERSIONS) {
  const FIXTURE = path.resolve('tests', 'fixtures', ver.file);
  const text = fs.readFileSync(FIXTURE, 'utf8');
  const fixture = JSON.parse(text) as SaveFile;

  test.describe(`save made by ${ver.v}`, () => {
    test('the fixture really is a mid-fight save with history', () => {
      expect(fixture.version).toBe(1);
      expect(fixture.game.run?.phase).toBe('fight');
      expect(fixture.game.run?.fight?.diceUsed, 'a die was already used this turn').toBeGreaterThan(0);
      expect(fixture.game.profile.stats.runsPlayed).toBe(ver.runs);
      expect(fixture.game.profile.featsDone).toHaveLength(ver.feats);
      expect(fixture.game.profile.unlockedHeroes).toHaveLength(ver.heroes);
      // The current engine accepts it as it is.
      expect(eng.load(text).game).toEqual(fixture.game);
    });

    test(`${ver.v} save placed in storage the way ${ver.v} kept it: the app resumes that exact fight with history intact and plays on`, async ({ page }) => {
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
      expect(g.profile.stats.runsPlayed).toBe(ver.runs);
      expect(g.profile.featsDone).toEqual(fixture.game.profile.featsDone);
      expect(g.profile.unlockedHeroes).toEqual(fixture.game.profile.unlockedHeroes);
      expect((await saveFile(page)).settings.reduceMotion, 'the old setting is kept').toBe(true);
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
      // Interface settings added since default safely when absent from an old save.
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
      await expect(page.getByTestId('feats-count')).toContainText(String(ver.feats));
      await page.getByTestId('btn-back').tap();
      await page.getByTestId('btn-stats').tap();
      const runs = (await state(page)).profile.stats.runsPlayed;
      expect(runs).toBeGreaterThanOrEqual(ver.runs);
      await expect(page.getByTestId('stat-runs-value')).toHaveText(String(runs));
      problems.assertClean();
    });

    test(`the same ${ver.v} save imported through Settings resumes the exact fight`, async ({ page }) => {
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
      expect(await state(page), `imported ${ver.v} game equals the file`).toEqual(fixture.game);
      // And it keeps working after a reload (it was saved).
      await page.reload();
      await waitBooted(page);
      await expectScreen(page, 'fight');
      expect(await state(page)).toEqual(fixture.game);
      const g = await state(page);
      await perform(page, g, nextAction(eng, g, DEFAULT_BOT));
      problems.assertClean();
    });
  });
}
