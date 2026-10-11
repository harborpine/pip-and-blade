import { expect, test } from '@playwright/test';
import { expectScreen, idle, openApp, startRun, state, watch, PARTY } from './support/app';
import { nextAction, DEFAULT_BOT } from './support/bot';
import { eng } from './support/app';
import { perform } from './support/driver';

test('smoke: app loads, a run starts, one full turn plays through real taps', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await expectScreen(page, 'home');
  await expect(page.getByTestId('title')).toHaveText('Pip & Blade');
  await startRun(page, 'qa-smoke', PARTY);
  let g = await state(page);
  expect(g.run?.phase).toBe('fight');
  const turn = g.run?.fight?.turn;
  // Play with the bot until the turn changes (or the fight ends).
  for (let i = 0; i < 30; i++) {
    const a = nextAction(eng, g, DEFAULT_BOT);
    g = await perform(page, g, a);
    if (a.type === 'endTurn') break;
  }
  await idle(page);
  expect(g.run?.fight?.turn !== turn || g.run?.phase !== 'fight').toBe(true);
  problems.assertClean();
});
