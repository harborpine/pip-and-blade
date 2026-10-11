/** Acceptance 4: close the app mid-fight and reopen it with the same storage: same screen, identical state, fight continues. */
import { devices, expect, test } from '@playwright/test';
import { ORIGIN, eng, expectScreen, openApp, screen, settle, startRun, state, waitBooted } from './support/app';
import { DEFAULT_BOT, nextAction } from './support/bot';
import { perform } from './support/driver';

test('closing and reopening mid-turn restores exactly the same fight', async ({ browser, page }) => {
  await openApp(page);
  await startRun(page, 'qa-resume');
  let g = await state(page);

  // Mid-turn: lock a die, reroll, then use one die (all with real taps).
  g = await perform(page, g, { type: 'toggleLock', die: 0 });
  g = await perform(page, g, { type: 'reroll' });
  const dv = eng.dice(g).find((d) => d.usable && !d.locked && d.effect !== 'blank') ?? eng.dice(g).find((d) => d.usable);
  if (!dv) throw new Error('no usable die');
  g = await perform(page, g, dv.needsTarget && dv.targets[0] ? { type: 'useDie', die: dv.die, target: dv.targets[0] } : { type: 'useDie', die: dv.die });
  await settle(page);
  expect(g.run?.fight?.phase).toBe('acting');
  expect(g.run?.fight?.rerollsLeft).toBeLessThan(2);
  const before = await state(page);
  const screenBefore = await screen(page);
  expect(screenBefore).toBe('fight');

  // Close everything, keep only what the browser stored (IndexedDB + localStorage).
  const stored = await page.context().storageState({ indexedDB: true });
  await page.context().close();

  const context = await browser.newContext({ ...devices['iPhone 14'], storageState: stored, baseURL: `${ORIGIN}/pip-and-blade/` });
  const page2 = await context.newPage();
  await page2.goto('./');
  await waitBooted(page2);
  await expectScreen(page2, 'fight');
  const after = await state(page2);
  expect(after, 'the state after reopening is identical to the state before closing').toEqual(before);
  expect(await screen(page2)).toBe(screenBefore);

  // And the fight continues from there.
  let g2 = after;
  for (let i = 0; i < 4; i++) g2 = await perform(page2, g2, nextAction(eng, g2, DEFAULT_BOT));
  expect(g2.run).not.toBeNull();
  await context.close();
});
