/** Acceptance 5: export the save to a file, reset progress, import the file, and get exactly the same state back. */
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { eng, expectScreen, idle, openApp, richSave, saveFile, settle, startRun, state, watch } from './support/app';
import { perform } from './support/driver';

test('export, reset, import restores the exact state (profile and run in progress)', async ({ page }, info) => {
  const problems = watch(page);
  await openApp(page, { save: richSave() });
  await startRun(page, 'qa-backup');
  const g = await state(page);
  const g2 = await perform(page, g, { type: 'toggleLock', die: 1 });
  await perform(page, g2, { type: 'reroll' });
  const exported = await state(page);
  expect(exported.run).not.toBeNull();

  // Export (capture the download).
  await page.getByTestId('btn-menu').tap();
  await page.getByTestId('menu-settings').tap();
  await expectScreen(page, 'settings');
  const dl = page.waitForEvent('download');
  await page.getByTestId('btn-export').tap();
  const download = await dl;
  expect(download.suggestedFilename()).toMatch(/^pip-and-blade-\d{4}-\d{2}-\d{2}\.json$/);
  const file = info.outputPath('backup.json');
  await download.saveAs(file);
  const text = fs.readFileSync(file, 'utf8');
  const loaded = eng.load(text);
  expect(loaded.game, 'the exported file holds the current game').toEqual(exported);
  expect(loaded.game).toEqual((await saveFile(page)).game);

  // Reset progress: cancel keeps everything, confirm wipes it.
  await page.getByTestId('btn-reset').tap();
  await expect(page.getByTestId('confirm-reset')).toBeVisible();
  await page.getByTestId('confirm-reset-cancel').tap();
  expect(await state(page)).toEqual(exported);
  await page.getByTestId('btn-reset').tap();
  await page.getByTestId('confirm-reset-confirm').tap();
  await idle(page);
  const wiped = await state(page);
  expect(wiped.run).toBeNull();
  expect(wiped).toEqual(eng.newGame());
  await expectScreen(page, 'home');
  // The "new here" offer comes back on a wiped profile; dismiss it.
  await page.getByTestId('tutorial-offer-no').tap();

  // Import the file.
  await page.getByTestId('btn-settings').tap();
  await page.getByTestId('input-import').setInputFiles(file);
  await expect(page.getByTestId('confirm-import')).toBeVisible();
  await page.getByTestId('confirm-import-confirm').tap();
  await idle(page);
  await settle(page);
  expect(await state(page), 'imported state equals the exported state').toEqual(exported);
  await expectScreen(page, 'fight');
  problems.assertClean();
});

test('importing a file that is not a save is refused and changes nothing', async ({ page }, info) => {
  await openApp(page, { save: richSave() });
  const before = await state(page);
  const bad = info.outputPath('bad.json');
  fs.writeFileSync(bad, '{"not":"a save"}');
  await page.getByTestId('btn-settings').tap();
  await page.getByTestId('input-import').setInputFiles(bad);
  await expect(page.getByTestId('toast')).toContainText('cannot be used');
  await expect(page.getByTestId('confirm-import')).toHaveCount(0);
  expect(await state(page)).toEqual(before);
});
