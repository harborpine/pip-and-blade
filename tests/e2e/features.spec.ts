/**
 * Final-content coverage: the Fury rule, the labelled dice-trick intents and their visible effects,
 * the hero-select info sheets, and the blank-face wording.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameState } from '@shared';
import { PARTY, eng, expectScreen, idle, openApp, state, watch } from './support/app';
import { perform } from './support/driver';
import { openFury } from './support/fury';
import { pathTo, replay } from './support/reach';
import { blankShowing, cursedShowing, jammedDie, trickIntent } from './support/scenes';

const fury = eng.content.rules.fury;

/** Check the per-hero forecast chips, End Turn, then confirm the real HP loss equals the forecast. */
async function endTurnAndCompare(page: Page, g: GameState): Promise<GameState> {
  const run = g.run;
  if (!run?.fight) throw new Error('no fight');
  const fc = eng.forecast(g);
  for (const [i, h] of run.heroes.entries()) {
    if (h.downed) continue;
    const chip = (await page.getByTestId(`forecast-${i}`).textContent()) ?? '';
    const want = fc.heroes[i]?.hpLoss ?? 0;
    if (want > 0) expect(chip, `forecast chip for hero ${i}`).toBe(`-${want}`);
    else expect(['safe', 'blocked']).toContain(chip);
  }
  const before = run.heroes.map((h) => h.hp);
  const next = await perform(page, g, { type: 'endTurn' });
  next.run?.heroes.forEach((h, i) => {
    expect((before[i] ?? 0) - h.hp, `hero ${i}: real HP lost equals the forecast`).toBe(fc.heroes[i]?.hpLoss ?? 0);
  });
  return next;
}

test('Fury: badge warns on the turn before, shows on the fury turn, the sheet states the real numbers, and forecasts stay exact', async ({ page }) => {
  test.setTimeout(180_000);
  expect(fury, 'content defines the global Fury rule').toBeTruthy();
  if (!fury) return;
  const problems = watch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await openFury(page, fury.fromTurn - 1);
  let g = await state(page);
  expect(g.run?.fight?.turn).toBe(fury.fromTurn - 1);

  await expect(page.getByTestId('fury-badge')).toHaveText('Fury next turn');
  await page.getByTestId('fury-badge').tap();
  await expect(page.getByTestId('info-fury')).toBeVisible();
  const text = (await page.getByTestId('info-fury').textContent()) ?? '';
  expect(text).toContain(`turn ${fury.fromTurn}`);
  expect(text).toContain(`${fury.strengthPerTurn} Strength`);
  await page.getByTestId('info-close').tap();

  // Turn 11 -> 12 with real taps. The badge changes; the forecast is exact on every fury turn.
  g = await endTurnAndCompare(page, g);
  expect(g.run?.fight?.turn).toBe(fury.fromTurn);
  await expect(page.getByTestId('fury-badge')).toHaveText('FURY');
  await expect(page.getByTestId('fury-badge')).toHaveAttribute('data-active', 'true');
  for (let i = 0; i < 2; i++) {
    const strengthBefore = g.run?.fight?.enemies.map((e) => e.statuses.strength ?? 0) ?? [];
    g = await endTurnAndCompare(page, g);
    const after = g.run?.fight?.enemies.map((e) => e.statuses.strength ?? 0) ?? [];
    expect(after.some((s, k) => s >= (strengthBefore[k] ?? 0) + fury.strengthPerTurn), 'enemies gained Strength from Fury').toBe(true);
    await expect(page.getByTestId('fury-badge')).toHaveText('FURY');
  }
  problems.assertClean();
});

test('Fury shows nowhere before the warning turn', async ({ page }) => {
  await openApp(page);
  await openFury(page, 1);
  await expect(page.getByTestId('fury-badge')).toHaveCount(0);
});

test('intent label: Lock die, and the jammed die then cannot be rerolled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await replay(page, pathTo('qa-tlock', trickIntent('lockDie')));
  let g = await state(page);
  const owner = g.run?.fight?.enemies.find((e) => e.intent?.actions.some((a) => a.type === 'lockDie'));
  const action = owner?.intent?.actions.find((a) => a.type === 'lockDie');
  if (!owner || !action) throw new Error('no lock intent');
  // 0.2.0 look: the bubble shows icons and numbers; the words live in its aria-label and the intent sheet.
  await expect(page.getByTestId(`intent-${owner.uid}`)).toHaveAttribute('aria-label', /intends/);
  await page.getByTestId(`intent-${owner.uid}`).tap();
  await expect(page.getByTestId('info-intent')).toBeVisible();
  await expect(page.getByTestId('info-intent')).toContainText(/cannot be rerolled/i);
  await page.getByTestId('info-close').tap();

  g = await perform(page, g, { type: 'endTurn' });
  const hero = action.heroes[0];
  expect(hero, 'the intent names a hero').toBeDefined();
  expect(g.run?.heroes[hero ?? 0]?.downed, 'the jam target is still up').toBe(false);
  const di = eng.dice(g).findIndex((d) => d.hero === hero);
  const die = eng.dice(g)[di];
  expect(die?.jammed, 'the targeted hero die is jammed next turn').toBe(true);
  const el = page.getByTestId(`die-${di}`);
  await expect(el).toHaveClass(/jammed/);
  await expect(el.locator('.die-overlay')).not.toHaveCount(0);
  const faceBefore = g.run?.fight?.dice[di]?.face;
  if (eng.canApply(g, { type: 'reroll' })) g = await perform(page, g, { type: 'reroll' });
  expect(g.run?.fight?.dice[di]?.face, 'a jammed die keeps its face on reroll').toBe(faceBefore);
  // 0.2.0: the jammed die shows a chain instead of a padlock; tapping it changes nothing and explains why.
  const lockEl = page.getByTestId(`lock-${di}`);
  await expect(lockEl).toHaveAttribute('data-jammed', 'true');
  await expect(lockEl).toHaveClass(/chain/);
  const beforeChain = JSON.stringify(await state(page));
  await lockEl.tap();
  await expect(page.getByTestId('hint-line')).toContainText(/jammed/i);
  expect(JSON.stringify(await state(page)), 'tapping the chain changes nothing').toBe(beforeChain);
});

test('intent label: Curse face, and the face is then cursed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await replay(page, pathTo('qa-tcurse', trickIntent('curseFace')));
  let g = await state(page);
  const owner = g.run?.fight?.enemies.find((e) => e.intent?.actions.some((a) => a.type === 'curseFace'));
  const action = owner?.intent?.actions.find((a) => a.type === 'curseFace');
  if (!owner || !action) throw new Error('no curse intent');
  await expect(page.getByTestId(`intent-${owner.uid}`)).toHaveAttribute('aria-label', /intends/);
  await page.getByTestId(`intent-${owner.uid}`).tap();
  await expect(page.getByTestId('info-intent')).toContainText(/curse/i);
  await expect(page.getByTestId('info-intent')).toContainText(/blank/i);
  await page.getByTestId('info-close').tap();
  g = await perform(page, g, { type: 'endTurn' });
  const hero = action.heroes[0];
  const face = action.faces[0];
  expect(hero, 'the intent names a hero').toBeDefined();
  expect(face, 'the intent names the exact face').toBeDefined();
  expect(g.run?.fight?.heroes[hero ?? 0]?.cursed, 'the face named in the intent is cursed').toContain(face);
});

test('a cursed face showing on a die reads Cursed and a blank face reads Blank', async ({ page }) => {
  await openApp(page);
  await replay(page, pathTo('qa-curse', cursedShowing));
  const g = await state(page);
  const di = eng.dice(g).findIndex((d) => d.cursed);
  await expect(page.getByTestId(`die-${di}`)).toHaveClass(/cursed/);
  await expect(page.getByTestId(`die-${di}`)).toContainText('Cursed');

  await page.evaluate(() => (window as unknown as { __pip: { dispatch(a: unknown): void } }).__pip.dispatch({ type: 'abandonRun' }));
  await replay(page, pathTo('qa-blank', blankShowing));
  const g2 = await state(page);
  const bi = eng.dice(g2).findIndex((d) => d.effect === 'blank' && !d.cursed);
  await expect(page.getByTestId(`die-${bi}`)).toContainText('Blank');
});

test('intent label: Steal reroll, and the party then has fewer rerolls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await replay(page, pathTo('qa-tsteal', trickIntent('stealReroll')));
  let g = await state(page);
  const owner = g.run?.fight?.enemies.find((e) => e.intent?.actions.some((a) => a.type === 'stealReroll'));
  const action = owner?.intent?.actions.find((a) => a.type === 'stealReroll');
  if (!owner || !action) throw new Error('no steal intent');
  await expect(page.getByTestId(`intent-${owner.uid}`)).toHaveAttribute('aria-label', /intends/);
  await page.getByTestId(`intent-${owner.uid}`).tap();
  await expect(page.getByTestId('info-intent')).toContainText(/steal/i);
  await page.getByTestId('info-close').tap();
  const before = g.run?.fight?.rerollsLeft ?? 0;
  g = await perform(page, g, { type: 'endTurn' });
  expect(g.run?.phase).toBe('fight');
  const after = g.run?.fight?.rerollsLeft ?? 0;
  expect(after, 'rerolls this turn after the steal').toBeLessThan(before);
  await expect(page.getByTestId('btn-reroll')).toHaveAttribute('data-rerolls', String(after));
});

test('hero select: the info button shows all six faces, a locked hero shows its feat', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('btn-new-run').tap();
  await expectScreen(page, 'heroselect');
  const d = eng.content.heroes.find((h) => h.id === PARTY[0]);
  if (!d) throw new Error('no hero');
  await page.getByTestId(`hero-info-${d.id}`).tap();
  const sheet = page.getByTestId('info-hero-def');
  await expect(sheet).toBeVisible();
  const text = (await sheet.textContent()) ?? '';
  expect(d.faces.length).toBe(6);
  for (const f of d.faces) expect(text, `sheet lists face ${f.name}`).toContain(f.name);
  expect(text).toContain(`HP ${d.maxHp}`);
  await page.getByTestId('info-close').tap();
  // Opening the sheet must not have toggled the hero.
  expect((await state(page)).run).toBeNull();

  const locked = eng.content.heroes.find((h) => !h.starter);
  if (!locked) throw new Error('no locked hero');
  const feat = eng.content.feats.find((f) => f.unlocks?.heroes?.includes(locked.id));
  await page.getByTestId(`hero-info-${locked.id}`).tap();
  const ls = page.getByTestId('info-hero-locked');
  await expect(ls).toBeVisible();
  if (feat) {
    await expect(ls).toContainText(feat.name);
    await expect(ls).toContainText(feat.text);
  }
  await idle(page);
});

test('jammed die scene is reachable and shows the jam overlay', async ({ page }) => {
  await openApp(page);
  await replay(page, pathTo('qa-jam', jammedDie));
  const g = await state(page);
  const di = eng.dice(g).findIndex((d) => d.jammed);
  await expect(page.getByTestId(`die-${di}`)).toHaveClass(/jammed/);
});
