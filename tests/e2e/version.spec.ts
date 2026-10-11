/** 0.2.0 version marker and the one-time Home Screen install tip (shown in a browser tab only). */
import { expect, test } from '@playwright/test';
import { PARTY, expectScreen, openApp, readPrefs, startRun, watch } from './support/app';
import { layoutIssues } from './support/layout';

test('Settings shows Version 0.2.0 and version.json serves 0.2.0', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await page.getByTestId('btn-settings').tap();
  await expect(page.getByTestId('app-version')).toHaveText(/0\.2\.0/);
  await expect(page.getByTestId('app-version')).toHaveText('Version 0.2.0');
  const res = await page.request.get('version.json');
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { version?: string };
  expect(body.version).toBe('0.2.0');
  problems.assertClean();
});

test('install tip: shows once in a tab, can be dismissed, stays dismissed across reloads and screens', async ({ page }) => {
  const problems = watch(page);
  await openApp(page, { prefs: null });
  await expectScreen(page, 'home');
  const tip = page.getByTestId('install-tip');
  await expect(tip).toBeVisible();
  const text = (await tip.textContent()) ?? '';
  expect(text).toContain('Home Screen');
  for (const word of ['Share', 'Add to Home Screen', 'Add']) expect(text, `tip names the step "${word}"`).toContain(word);
  expect(await layoutIssues(page), 'Home with the tip fits and every control is tappable').toEqual([]);
  expect((await readPrefs(page))['installTipDismissed'] ?? false).toBe(false);

  // Showing it did not dismiss it: it is still there after a reload until the player says so.
  await page.reload();
  await expect(page.getByTestId('install-tip')).toBeVisible();

  await page.getByTestId('install-tip-dismiss').tap();
  await expect(page.getByTestId('install-tip')).toHaveCount(0);
  expect((await readPrefs(page))['installTipDismissed']).toBe(true);
  await page.reload();
  await expectScreen(page, 'home');
  await expect(page.getByTestId('install-tip')).toHaveCount(0);
  // Away and back, and after a whole run.
  await page.getByTestId('btn-settings').tap();
  await page.getByTestId('btn-back').tap();
  await expect(page.getByTestId('install-tip')).toHaveCount(0);
  await startRun(page, 'qa-tip', PARTY);
  await expect(page.getByTestId('install-tip'), 'never during a run').toHaveCount(0);
  await page.evaluate(() => (window as unknown as { __pip: { dispatch(a: unknown): void } }).__pip.dispatch({ type: 'abandonRun' }));
  await expectScreen(page, 'home');
  await expect(page.getByTestId('install-tip')).toHaveCount(0);
  problems.assertClean();
});

test('install tip never shows when launched from the Home Screen (standalone)', async ({ page }) => {
  // Safari reports navigator.standalone === true and display-mode: standalone for a Home Screen app;
  // Playwright cannot switch display modes, so both signals are faked before the app starts.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { get: () => true });
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q: string) => {
      const m = real(q);
      return /display-mode:\s*standalone/.test(q)
        ? new Proxy(m, { get: (t, k) => (k === 'matches' ? true : (Reflect.get(t, k) as unknown)) })
        : m;
    };
  });
  await openApp(page, { prefs: null });
  await expectScreen(page, 'home');
  await expect(page.getByTestId('install-tip')).toHaveCount(0);
  expect(await page.evaluate(() => (navigator as Navigator & { standalone?: boolean }).standalone)).toBe(true);
  await page.reload();
  await expect(page.getByTestId('install-tip')).toHaveCount(0);
});

test.describe('install tip layout at small tab sizes', () => {
  for (const [w, h] of [[390, 664], [393, 659], [402, 681], [375, 548]] as const) {
    test(`Home with the tip at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await openApp(page, { prefs: null });
      await expect(page.getByTestId('install-tip')).toBeVisible();
      expect(await layoutIssues(page)).toEqual([]);
    });
  }
});
