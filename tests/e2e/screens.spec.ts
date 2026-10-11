/**
 * Every screen, at 390x844 (iPhone 14) and 375x667 (small iPhone):
 *  - iPhone layout rules (no page scroll, 44px targets, nothing off-screen or overlapping,
 *    fight controls in the lower half), no console errors, no failed requests;
 *  - with PIP_UPDATE_SCREENSHOTS=1 set, a PNG of each screen is written to tests/e2e/screenshots/<size>/
 *    (the visual record). A normal run writes no files, so the working tree stays clean.
 * Landscape shows the rotate overlay.
 */
import { expect, test } from '@playwright/test';
import path from 'node:path';

const UPDATE_SHOTS = process.env['PIP_UPDATE_SCREENSHOTS'] === '1';
import { openApp, richSave, settle, watch } from './support/app';
import { layoutIssues } from './support/layout';
import { SCENES } from './support/uiscenes';

const SIZES = [
  { dir: '390x844', width: 390, height: 844, shot: true },
  { dir: '390x664', width: 390, height: 664, shot: true },
  { dir: '393x852', width: 393, height: 852, shot: false },
  { dir: '402x874', width: 402, height: 874, shot: false },
  { dir: '393x659', width: 393, height: 659, shot: false },
  { dir: '402x681', width: 402, height: 681, shot: false },
  { dir: '375x667', width: 375, height: 667, shot: false },
];

for (const size of SIZES) {
  test.describe(`screens at ${size.dir}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    for (const scene of SCENES) {
      test(`${scene.name}`, async ({ page }) => {
        const problems = watch(page);
        await openApp(page, { offerTutorial: scene.offerTutorial, ...(scene.freshPrefs ? { prefs: null } : {}), ...(scene.rich ? { save: richSave() } : {}) });
        await scene.setup(page);
        await settle(page);
        if (size.shot && UPDATE_SHOTS) await page.screenshot({ path: path.resolve('tests', 'e2e', 'screenshots', size.dir, `${scene.name}.png`), scale: 'css' });
        const issues = await layoutIssues(page);
        expect(issues, `layout problems on ${scene.name} at ${size.dir}`).toEqual([]);
        problems.assertClean();
      });
    }
  });
}

test.describe('landscape', () => {
  test.use({ viewport: { width: 844, height: 390 } });
  test('shows the rotate-back-to-portrait overlay', async ({ page }) => {
    await openApp(page);
    await expect(page.getByTestId('rotate-overlay')).toBeVisible();
    if (UPDATE_SHOTS) await page.screenshot({ path: path.resolve('tests', 'e2e', 'screenshots', 'landscape-rotate.png'), scale: 'css' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload(); // WebKit only re-evaluates media queries on load
    await expect(page.getByTestId('rotate-overlay')).toBeHidden();
  });
});

