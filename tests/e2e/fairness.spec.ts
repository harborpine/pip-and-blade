/**
 * Acceptance 9: what the screen shows is what then happens.
 *  - the number on each target while a die is selected equals the real change when the die is used
 *  - the End Turn forecast (per hero chip and the button text) equals the real HP lost in the enemy phase
 *  - every living enemy shows its intent, every turn
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameState, TargetRef } from '@shared';
import { eng, idle, openApp, startRun, state, watch } from './support/app';
import { DEFAULT_BOT, nextAction } from './support/bot';
import { perform } from './support/driver';

const num = (text: string | null, re: RegExp): number => {
  const m = text?.match(re);
  return m ? Number(m[1]) : 0;
};

async function expectIntentsShown(page: Page, g: GameState): Promise<void> {
  const f = g.run?.fight;
  if (!f) return;
  for (const e of f.enemies.filter((x) => x.hp > 0)) {
    expect(e.intent, `enemy ${e.uid} has an intent in state`).not.toBeNull();
    const bubble = page.getByTestId(`intent-${e.uid}`);
    await expect(bubble, `intent of enemy ${e.uid} is visible`).toBeVisible();
    // Icons + numbers (flat icons are [data-sprite] elements); the sentence is the aria-label ("<Enemy> intends <move>"), and at least one icon is drawn.
    await expect(bubble, `intent of enemy ${e.uid} is described`).toHaveAttribute('aria-label', /intends/);
    expect(await bubble.locator('[data-sprite]').count(), `intent of enemy ${e.uid} shows at least one action`).toBeGreaterThan(0);
  }
}

/** Select the die and read the preview text the UI shows on the target, before using it. */
async function checkPreviewAndUse(page: Page, g: GameState, die: number, target: TargetRef | undefined): Promise<GameState> {
  const run = g.run;
  const f = run?.fight;
  if (!run || !f) throw new Error('not in a fight');
  const pv = eng.previewDie(g, die, target);
  const dieEl = page.getByTestId(`die-${die}`);
  const nTargets = Number(await dieEl.getAttribute('data-targets'));
  const peeked = !!target && nTargets === 1;
  if (peeked) {
    // 0.2.0: a die with ONE target is used by a single tap, so its preview is read by peeking
    // (a long-press shows the previews without using the die).
    const box = await dieEl.boundingBox();
    if (!box) throw new Error('no die box');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(500); // a long press is a held finger: the hold time is the thing being tested
    await page.mouse.up();
  } else {
    await dieEl.tap();
  }
  if (target) {
    const id = target.side === 'enemy' ? `preview-enemy-${target.uid}` : `preview-hero-${target.index}`;
    const box = page.getByTestId(id);
    await expect(box, 'a preview is shown on the target').toBeVisible();
    // 0.2.0 look: the chip holds icon + number parts; its words are in aria-label ("-3 HP", "+2 shield", "KO, -3 HP").
    const shown = (await box.getAttribute('aria-label')) ?? '';
    const hit = pv.hits.find((h) => (target.side === 'enemy' ? h.target.side === 'enemy' && h.target.uid === target.uid : h.target.side === 'hero' && h.target.index === target.index));
    if (hit) {
      expect(num(shown, /-(\d+) HP/), `HP loss shown "${shown}"`).toBe(hit.hpLoss);
      if (hit.kills) expect(shown).toContain('KO');
      if (hit.heal > 0) expect(num(shown, /\+(\d+) HP/), `heal shown "${shown}"`).toBe(hit.heal);
      if (hit.shieldGain > 0) expect(num(shown, /\+(\d+) shield/), `shield shown "${shown}"`).toBe(hit.shieldGain);
      if (hit.poison > 0) expect(num(shown, /(\d+) poison/), `poison shown "${shown}"`).toBe(hit.poison);
    }
    if (peeked) {
      await page.getByTestId('info-close').tap();
      await expect(page.getByTestId('info-close')).toHaveCount(0);
      expect(JSON.stringify(await state(page)), 'peeking does not use the die').toBe(JSON.stringify(g));
      await dieEl.tap(); // the single-target die is now used by one tap
    } else {
      await page.getByTestId(id.startsWith('preview-enemy') ? `enemy-${(target as { uid: number }).uid}` : `hero-${(target as { index: number }).index}`).tap();
    }
    await idle(page);
    const after = await state(page);
    // The real change equals the previewed change.
    if (hit && target.side === 'enemy') {
      const before = f.enemies.find((e) => e.uid === target.uid);
      const now = after.run?.fight?.enemies.find((e) => e.uid === target.uid);
      const hpAfter = now ? now.hp : 0;
      expect((before?.hp ?? 0) - hpAfter, 'enemy HP change equals the shown preview').toBe(hit.hpLoss);
    }
    if (hit && target.side === 'hero' && hit.heal > 0) {
      const gain = (after.run?.heroes[target.index]?.hp ?? 0) - (run.heroes[target.index]?.hp ?? 0);
      expect(gain, 'hero heal equals the shown preview').toBe(hit.heal);
    }
    expect(JSON.stringify(after)).toBe(JSON.stringify(eng.apply(g, { type: 'useDie', die, target }).game));
    return after;
  }
  await dieEl.tap();
  await idle(page);
  return state(page);
}

test('previews and the End Turn forecast match what actually happens', async ({ page }) => {
  test.setTimeout(600_000);
  const problems = watch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await startRun(page, 'qa-fair-3');
  let g = await state(page);
  let previews = 0;
  let forecasts = 0;
  for (let i = 0; i < 400 && g.run && g.run.phase !== 'victory' && g.run.phase !== 'defeat' && (g.run.fightsWon < 4); i++) {
    const a = nextAction(eng, g, DEFAULT_BOT);
    const f = g.run.fight;
    if (g.run.phase === 'fight' && f) {
      if (f.phase === 'rolling' && a.type !== 'useDie') await expectIntentsShown(page, g);
      if (a.type === 'useDie') {
        const dv = eng.dice(g).find((d) => d.die === a.die);
        if (dv && a.target) {
          g = await checkPreviewAndUse(page, g, a.die, a.target);
          previews += 1;
          continue;
        }
      }
      if (a.type === 'endTurn') {
        const fc = eng.forecast(g);
        // Per-hero chips and the End Turn summary text.
        for (const [idx, hero] of g.run.heroes.entries()) {
          if (hero.downed) continue;
          const chip = (await page.getByTestId(`forecast-${idx}`).textContent()) ?? '';
          const want = fc.heroes[idx];
          if (want?.downed) expect(chip).toBe('DOWN!');
          else if ((want?.hpLoss ?? 0) > 0) expect(chip, `forecast chip for hero ${idx}`).toBe(`-${want?.hpLoss}`);
          else expect(['safe', 'blocked']).toContain(chip);
        }
        // 0.2.0 look: visible text is "4/0/3"; the sentence ("incoming 4/0/3") is the aria-label.
        const summary = (await page.getByTestId('end-turn-forecast').getAttribute('aria-label')) ?? '';
        if (!fc.partyWipe && !fc.heroes.some((h) => h.downed) && fc.heroes.some((h) => h.hpLoss > 0)) {
          expect(summary.replace(/\s+/g, ''), 'End Turn summary lists the exact damage per hero').toBe(`incoming${fc.heroes.map((h) => h.hpLoss).join('/')}`);
        }
        const hpBefore = g.run.heroes.map((h) => (h.downed ? 0 : h.hp));
        const wasDowned = g.run.heroes.map((h) => h.downed);
        g = await perform(page, g, a);
        forecasts += 1;
        const now = g.run;
        if (now && now.phase === 'fight') {
          // Actual loss in the enemy phase equals the forecast (heroes that were up).
          now.heroes.forEach((h, idx) => {
            if (wasDowned[idx]) return;
            const lost = (hpBefore[idx] ?? 0) - (h.downed ? 0 : h.hp);
            expect(lost, `hero ${idx}: HP lost in the enemy phase equals the forecast`).toBe(fc.heroes[idx]?.hpLoss ?? 0);
          });
        }
        continue;
      }
    }
    g = await perform(page, g, a);
  }
  expect(previews, 'target previews were checked').toBeGreaterThan(5);
  expect(forecasts, 'End Turn forecasts were checked').toBeGreaterThan(3);
  problems.assertClean();
});

test('a lethal forecast warns before ending the turn', async ({ page }) => {
  await openApp(page);
  await startRun(page, 'qa-fair-warn');
  let g = await state(page);
  // Keep ending turns without acting until the forecast says a hero would be downed.
  for (let i = 0; i < 40 && g.run?.phase === 'fight'; i++) {
    const fc = eng.forecast(g);
    if (fc.heroes.some((h) => h.downed)) {
      await expect(page.getByTestId('end-turn-forecast')).toContainText(/down|WIPE/i);
      await page.getByTestId('btn-end-turn').tap();
      await expect(page.getByTestId('confirm-end-turn')).toBeVisible();
      await page.getByTestId('confirm-end-turn-cancel').tap();
      expect(JSON.stringify(await state(page))).toBe(JSON.stringify(g));
      return;
    }
    g = await perform(page, g, { type: 'endTurn' });
  }
  throw new Error('no lethal forecast arose on seed qa-fair-warn: pick another seed');
});

test('long-pressing a die, an enemy and a hero opens an info sheet without using anything', async ({ page }) => {
  await openApp(page);
  await startRun(page, 'qa-longpress');
  const g = await state(page);
  const targets = ['die-0', `enemy-${g.run?.fight?.enemies[0]?.uid}`, 'hero-0'];
  for (const id of targets) {
    const box = await page.getByTestId(id).boundingBox();
    if (!box) throw new Error(`no box for ${id}`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700); // a long press is a held finger: the hold time is the thing being tested
    await page.mouse.up();
    await expect(page.getByTestId('info-close'), `info sheet for ${id}`).toBeVisible();
    await page.getByTestId('info-close').tap();
    await expect(page.getByTestId('info-close')).toHaveCount(0);
  }
  expect(JSON.stringify(await state(page)), 'a long press changes nothing in the game').toBe(JSON.stringify(g));
});
