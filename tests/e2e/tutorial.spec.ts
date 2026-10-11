/** Acceptance 1: the tutorial is offered to a new player, can be completed, skipped, and replayed from Settings. */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { eng, expectScreen, idle, openApp, state, watch } from './support/app';
import { DEFAULT_BOT, nextAction } from './support/bot';
import { perform } from './support/driver';

const step = (page: Page) => page.getByTestId('tutorial-card').getAttribute('data-step');

test('a fresh profile is offered the tutorial and can finish it, step by step', async ({ page }) => {
  const problems = watch(page);
  await openApp(page, { offerTutorial: true });
  await expectScreen(page, 'home');
  await expect(page.getByTestId('tutorial-offer')).toBeVisible();
  expect((await state(page)).profile.tutorialDone).toBe(false);
  await page.getByTestId('tutorial-offer-yes').tap();
  await idle(page);
  await expectScreen(page, 'fight');
  let g = await state(page);
  expect(g.run?.mode).toBe('tutorial');

  // Step 1: read an enemy intent.
  await expect(page.getByTestId('tutorial-card')).toHaveAttribute('data-step', 'intent');
  const first = g.run?.fight?.enemies[0];
  expect(first?.intent, 'every living enemy shows an intent').not.toBeNull();
  await page.getByTestId(`intent-${first?.uid}`).tap();
  await expect(page.getByTestId('info-intent').or(page.getByTestId('info-sheet'))).toBeVisible();
  await page.getByTestId('info-close').tap();
  // Step 2: lock a die.
  await expect(page.getByTestId('tutorial-card')).toHaveAttribute('data-step', 'lock');
  await page.getByTestId('die-0').tap();
  await idle(page);
  expect((await state(page)).run?.fight?.dice[0]?.locked).toBe(true);
  // Step 3: reroll.
  await expect(page.getByTestId('tutorial-card')).toHaveAttribute('data-step', 'reroll');
  const before = await state(page);
  await page.getByTestId('btn-reroll').tap();
  await idle(page);
  const afterReroll = await state(page);
  expect(afterReroll.run?.fight?.rerollsLeft).toBe((before.run?.fight?.rerollsLeft ?? 0) - 1);
  expect(afterReroll.run?.fight?.dice[0]?.face, 'the locked die keeps its face').toBe(before.run?.fight?.dice[0]?.face);
  // Step 4: Use dice.
  await expect(page.getByTestId('tutorial-card')).toHaveAttribute('data-step', 'usemode');
  await page.getByTestId('btn-use-dice').tap();
  // Step 5: pick a die and a target.
  await expect(page.getByTestId('tutorial-card')).toHaveAttribute('data-step', 'target');
  g = await state(page);
  const dv = eng.dice(g).find((d) => d.usable && d.needsTarget);
  expect(dv, 'a die that needs a target').toBeTruthy();
  if (!dv?.targets[0]) throw new Error('no target');
  await page.getByTestId(`die-${dv.die}`).tap();
  const t = dv.targets[0];
  const tid = t.side === 'enemy' ? `enemy-${t.uid}` : `hero-${t.index}`;
  await page.getByTestId(tid).tap();
  await idle(page);
  await expect(page.getByTestId('tutorial-card')).toHaveAttribute('data-step', 'end');
  expect(await step(page)).toBe('end');
  // Step 6: finish the fight by playing normally.
  g = await state(page);
  for (let i = 0; i < 80 && g.run?.phase === 'fight'; i++) g = await perform(page, g, nextAction(eng, g, DEFAULT_BOT));
  await expectScreen(page, 'victory');
  await expect(page.getByTestId('end-title')).toHaveText('Tutorial complete!');
  g = await state(page);
  expect(g.profile.tutorialDone).toBe(true);
  expect(g.profile.stats.runsPlayed, 'the tutorial counts for no stats').toBe(0);
  await page.getByTestId('btn-continue').tap();
  await expectScreen(page, 'home');
  expect((await state(page)).run).toBeNull();
  problems.assertClean();
});

test('"No thanks" declines the offer and it is not shown again', async ({ page }) => {
  await openApp(page, { offerTutorial: true });
  await page.getByTestId('tutorial-offer-no').tap();
  await expectScreen(page, 'home');
  await expect(page.getByTestId('tutorial-offer')).toHaveCount(0);
  await page.reload();
  await expectScreen(page, 'home');
  await expect(page.getByTestId('tutorial-offer')).toHaveCount(0);
});

test('Skip closes the coach card and the fight stays playable', async ({ page }) => {
  await openApp(page, { offerTutorial: true });
  await page.getByTestId('tutorial-offer-yes').tap();
  await expect(page.getByTestId('tutorial-card')).toBeVisible();
  await page.getByTestId('tutorial-skip').tap();
  await expect(page.getByTestId('tutorial-card')).toHaveCount(0);
  let g = await state(page);
  expect(g.run?.phase).toBe('fight');
  g = await perform(page, g, nextAction(eng, g, DEFAULT_BOT));
  expect(g.run).not.toBeNull();
});

test('the tutorial can be replayed from Settings', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('btn-settings').tap();
  await expectScreen(page, 'settings');
  await page.getByTestId('btn-replay-tutorial').tap();
  await idle(page);
  await expectScreen(page, 'fight');
  await expect(page.getByTestId('tutorial-card')).toBeVisible();
  expect((await state(page)).run?.mode).toBe('tutorial');
});
