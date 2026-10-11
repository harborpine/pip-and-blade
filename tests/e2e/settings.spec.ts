/** Acceptance 10 and 11: settings behave, no audio is ever created, nothing leaves the origin, and the app is idle-light. */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { eng, expectScreen, idle, openApp, richSave, saveFile, startRun, state, waitBooted, watch } from './support/app';
import { DEFAULT_BOT, nextAction } from './support/bot';
import { perform } from './support/driver';

/** Records every attempt to make sound, and counts requestAnimationFrame calls. */
const INSTRUMENT = `
  window.__qa = { audio: [], raf: 0 };
  for (const name of ['AudioContext', 'webkitAudioContext', 'OfflineAudioContext']) {
    if (window[name]) { const Orig = window[name]; window[name] = function () { window.__qa.audio.push(name); return new Orig(...arguments); }; }
  }
  const OrigAudio = window.Audio;
  window.Audio = function () { window.__qa.audio.push('Audio'); return new OrigAudio(...arguments); };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { window.__qa.audio.push('play'); return play.call(this); };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) { window.__qa.raf += 1; return raf(cb); };
`;

const qa = (page: Page) => page.evaluate(() => (window as unknown as { __qa: { audio: string[]; raf: number } }).__qa);

test('reduce motion toggles and persists across a reload', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('btn-settings').tap();
  const toggle = page.getByTestId('btn-reduce-motion');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  await toggle.tap();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  expect((await saveFile(page)).settings.reduceMotion).toBe(true);
  await page.reload();
  await page.getByTestId('btn-settings').tap();
  await expect(page.getByTestId('btn-reduce-motion')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.getByTestId('btn-reduce-motion').tap();
  await expect(page.getByTestId('btn-reduce-motion')).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  expect((await saveFile(page)).settings.reduceMotion).toBe(false);
});

test('reduce motion really shortens animations (same turn, same seed, quicker)', async ({ page }) => {
  await openApp(page);
  const timeTurn = async (): Promise<number> => {
    await startRun(page, 'qa-motion');
    const g = await state(page);
    const t0 = Date.now();
    await perform(page, g, { type: 'endTurn' });
    const ms = Date.now() - t0;
    await page.evaluate(() => (window as unknown as { __pip: { dispatch(a: unknown): void } }).__pip.dispatch({ type: 'abandonRun' }));
    await idle(page);
    return ms;
  };
  const full = await timeTurn();
  await page.getByTestId('btn-settings').tap();
  await page.getByTestId('btn-reduce-motion').tap();
  await page.getByTestId('btn-back').tap();
  const reduced = await timeTurn();
  expect(reduced, `end-turn animation: ${full} ms full motion vs ${reduced} ms reduced`).toBeLessThan(full * 0.8);
});

test('reset progress asks for confirmation, cancel keeps data, confirm wipes it', async ({ page }) => {
  await openApp(page, { save: richSave() });
  const before = await state(page);
  expect(before.profile.stats.runsPlayed).toBeGreaterThan(0);
  await page.getByTestId('btn-settings').tap();
  await page.getByTestId('btn-reset').tap();
  await expect(page.getByTestId('confirm-reset')).toBeVisible();
  await expect(page.getByTestId('confirm-reset')).toContainText('cannot be undone');
  await page.getByTestId('confirm-reset-cancel').tap();
  expect(await state(page)).toEqual(before);
  await page.getByTestId('btn-reset').tap();
  await page.getByTestId('confirm-reset-confirm').tap();
  await idle(page);
  expect(await state(page)).toEqual(eng.newGame());
  await page.reload();
  await waitBooted(page);
  expect(await state(page), 'the wipe is saved').toEqual(eng.newGame());
});

test('no audio is ever created and nothing leaves the origin', async ({ page }) => {
  const problems = watch(page);
  await openApp(page, { init: INSTRUMENT });
  await startRun(page, 'qa-silent');
  let g = await state(page);
  for (let i = 0; i < 14; i++) g = await perform(page, g, nextAction(eng, g, DEFAULT_BOT));
  await page.evaluate(() => (window as unknown as { __pip: { dispatch(a: unknown): void } }).__pip.dispatch({ type: 'abandonRun' }));
  for (const id of ['btn-collection', 'btn-feats', 'btn-stats', 'btn-daily', 'btn-settings']) {
    await page.getByTestId(id).tap();
    await page.getByTestId('btn-back').tap();
  }
  expect((await qa(page)).audio, 'attempts to create audio').toEqual([]);
  expect(await page.locator('audio, video').count()).toBe(0);
  expect(problems.foreignRequests, 'requests that left the origin').toEqual([]);
  problems.assertClean();
  await expectScreen(page, 'home');
});

test('idle battery: no looping animation and no requestAnimationFrame loop on Home or in a fight', async ({ page }) => {
  await openApp(page, { init: INSTRUMENT });
  async function checkIdle(where: string): Promise<void> {
    await idle(page);
    // let fades finish, then stay idle for 3 seconds
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
    await page.waitForTimeout(3000);
    const infinite = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations === Infinity && a.playState === 'running')
        .map((a) => (a as CSSAnimation).animationName ?? 'animation'),
    );
    expect(infinite, `running infinite animations on ${where}`).toEqual([]);
    const a = (await qa(page)).raf;
    await page.waitForTimeout(1000);
    const b = (await qa(page)).raf;
    expect(b - a, `requestAnimationFrame calls during 1 idle second on ${where}`).toBe(0);
  }
  await expectScreen(page, 'home');
  await checkIdle('Home');
  await startRun(page, 'qa-idle');
  await checkIdle('Fight (rolling)');
  const g = await state(page);
  await perform(page, g, nextAction(eng, g, DEFAULT_BOT));
  await checkIdle('Fight (after a move)');
});
