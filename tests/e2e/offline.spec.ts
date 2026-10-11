/** Acceptance 7: after one visit the app works fully offline, served by the service worker. */
import { expect, test } from '@playwright/test';
import { eng, expectScreen, openApp, startRun, state, waitBooted, watch } from './support/app';
import { DEFAULT_BOT, nextAction } from './support/bot';
import { perform } from './support/driver';

test('service worker installs, precaches, and the app loads and plays offline', async ({ page, context }) => {
  test.setTimeout(240_000);
  const problems = watch(page);
  await openApp(page);

  // Service worker support and installation.
  const supported = await page.evaluate(() => 'serviceWorker' in navigator);
  expect(supported, 'this browser exposes service workers').toBe(true);
  const active = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state ?? 'none';
  });
  expect(['activated', 'activating']).toContain(active);

  // One reload so the worker controls the page, then check the precache is full.
  await page.reload();
  await waitBooted(page);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const cached = await page.evaluate(async () => {
    let n = 0;
    for (const k of await caches.keys()) n += (await (await caches.open(k)).keys()).length;
    return n;
  });
  expect(cached, 'the whole app is precached').toBeGreaterThan(150);

  // Go offline and reload: everything comes from the service worker.
  problems.failedRequests.length = 0;
  await context.setOffline(true);
  await page.reload();
  await waitBooted(page);
  await expectScreen(page, 'home');
  await startRun(page, 'qa-offline');
  let g = await state(page);
  for (let i = 0; i < 12; i++) {
    const a = nextAction(eng, g, DEFAULT_BOT);
    g = await perform(page, g, a);
    if (a.type === 'endTurn') break;
  }
  // Images for the new screen are cached too.
  const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
  expect(broken, 'no broken images offline').toEqual([]);
  expect(problems.failedRequests, 'no failed requests for app assets while offline').toEqual([]);
  expect(problems.pageErrors).toEqual([]);
  expect(problems.foreignRequests).toEqual([]);
});
