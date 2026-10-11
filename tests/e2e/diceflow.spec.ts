/**
 * 0.2.0 dice flow (BRIEF-2 section 2, docs/redesign.md section B): no modes, tapping a die uses it,
 * a padlock under each die keeps it through a reroll, Undo gives rolling back, tap budget.
 * Every scene is reached with the bot/engine headless and replayed into the page; everything the
 * tests check about the flow is then done with real taps (counted by support/app.ts `tap`).
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameState } from '@shared';
import { WINNING_SEED } from './pinned';
import { eng, expectScreen, idle, openApp, readPrefs, state, tap, tapsSoFar, watch } from './support/app';
import { targetId } from './support/driver';
import { directPlan, findNone, findOne, hasMulti, hasNoTarget, hasOneTarget, hasPlan3, isBlank, multiDie, noTargetDie, oneTargetDie, useAction } from './support/flow';
import { pathTo, replay } from './support/reach';
import { blankShowing, jammedDie, turnStart } from './support/scenes';

const json = (g: GameState): string => JSON.stringify(g);

async function reach(page: Page, prefix: string, pred: (g: GameState) => boolean): Promise<GameState> {
  if ((await state(page)).run) {
    await page.evaluate(() => (window as unknown as { __pip: { dispatch(a: unknown): void } }).__pip.dispatch({ type: 'abandonRun' }));
    await idle(page);
  }
  await replay(page, pathTo(prefix, pred));
  return state(page);
}

const apply = (g: GameState, a: Parameters<typeof eng.apply>[1]): GameState => eng.apply(g, a).game;

test('the old mode controls exist on no screen: no Use dice, no Back to lock, no mode pill', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  const legacy = async (where: string): Promise<void> => {
    const n = await page.locator('[data-testid="btn-use-dice"], [data-testid="btn-back-to-lock"], [data-testid="mode-pill"], .mode-pill').count();
    expect(n, `legacy mode control present on ${where}`).toBe(0);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text, `legacy wording on ${where}`).not.toMatch(/\bUse dice\b|\bBack to lock\b|\bLOCK MODE\b|\bUSE MODE\b/i);
  };
  await legacy('home');
  await page.getByTestId('btn-new-run').tap();
  await legacy('heroselect');
  await page.getByTestId('btn-back').tap();
  // Fight: rolling, a lifted die, acting.
  const g = await reach(page, 'qa-multi', hasMulti);
  await expectScreen(page, 'fight');
  await legacy('fight (rolling)');
  const m = eng.dice(g).find(multiDie);
  if (!m) throw new Error('no multi-target die');
  await page.getByTestId(`die-${m.die}`).tap();
  await expect(page.getByTestId(`die-${m.die}`)).toHaveClass(/selected/);
  await legacy('fight (die lifted)');
  await page.getByTestId(`die-${m.die}`).tap();
  const t = eng.dice(g).find(directDie_)?.die;
  if (t !== undefined) await page.getByTestId(`die-${t}`).tap();
  await idle(page);
  await legacy('fight (acting)');
  // Every between-fight screen of the pinned winning run.
  const seen = new Set<string>();
  for (const phase of ['reward', 'doors', 'rest', 'shop', 'event', 'victory']) {
    const p = pathTo('win', (s) => s.run?.phase === phase, { seeds: [WINNING_SEED] });
    await page.evaluate(() => (window as unknown as { __pip: { dispatch(a: unknown): void } }).__pip.dispatch({ type: 'abandonRun' }));
    await replay(page, p);
    await legacy(phase);
    seen.add(phase);
  }
  expect([...seen]).toHaveLength(6);
});

function directDie_(d: ReturnType<typeof eng.dice>[number]): boolean {
  return oneTargetDie(d) || noTargetDie(d);
}

test('a die with exactly one target is used by a single tap', async ({ page }) => {
  const problems = watch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  const g = await reach(page, 'qa-one', hasOneTarget);
  const d = findOne(g);
  if (!d) throw new Error('no one-target die');
  await expect(page.getByTestId(`die-${d.die}`)).toHaveAttribute('data-targets', '1');
  const t0 = tapsSoFar(page);
  await tap(page, `die-${d.die}`);
  await idle(page);
  expect(tapsSoFar(page) - t0, 'one tap').toBe(1);
  expect(json(await state(page)), 'the die was used on its only target').toBe(json(apply(g, useAction(d))));
  await expect(page.getByTestId(`die-${d.die}`)).not.toHaveClass(/selected/);
  await expect(page.getByTestId(`die-${d.die}`)).toHaveAttribute('data-used', 'true');
  problems.assertClean();
});

test('a die that needs no target is used by a single tap', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  const g = await reach(page, 'qa-none', hasNoTarget);
  const d = findNone(g);
  if (!d) throw new Error('no no-target die');
  await expect(page.getByTestId(`die-${d.die}`)).toHaveAttribute('data-targets', '0');
  const t0 = tapsSoFar(page);
  await tap(page, `die-${d.die}`);
  await idle(page);
  expect(tapsSoFar(page) - t0).toBe(1);
  expect(json(await state(page))).toBe(json(apply(g, { type: 'useDie', die: d.die })));
});

test('a die with several targets lifts, shows exact previews, and is used on the target tap; tapping it again puts it down', async ({ page }) => {
  const problems = watch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  const g = await reach(page, 'qa-multi', hasMulti);
  const d = eng.dice(g).find(multiDie);
  if (!d) throw new Error('no multi-target die');
  const die = page.getByTestId(`die-${d.die}`);
  await expect(die).toHaveAttribute('data-targets', String(d.targets.length));

  // First tap: lifts, nothing is dispatched.
  await tap(page, `die-${d.die}`);
  await expect(die).toHaveClass(/selected/);
  expect(json(await state(page)), 'lifting a die uses nothing').toBe(json(g));
  for (const t of d.targets) {
    await expect(page.getByTestId(targetId(t)), 'valid target glows').toHaveClass(/targetable/);
    await expect(page.getByTestId(t.side === 'enemy' ? `preview-enemy-${t.uid}` : `preview-hero-${t.index}`), 'valid target shows its preview').toBeVisible();
  }
  // Tapping the die again puts it down.
  await tap(page, `die-${d.die}`);
  await expect(die).not.toHaveClass(/selected/);
  expect(json(await state(page)), 'putting a die down uses nothing').toBe(json(g));
  await expect(page.locator('.targetable')).toHaveCount(0);

  // Lift again and tap the last target: exactly two taps for the use.
  const target = d.targets[d.targets.length - 1];
  if (!target) throw new Error('no target');
  const t0 = tapsSoFar(page);
  await tap(page, `die-${d.die}`);
  await tap(page, targetId(target));
  await idle(page);
  expect(tapsSoFar(page) - t0, 'a multi-target die takes two taps').toBe(2);
  expect(json(await state(page))).toBe(json(apply(g, { type: 'useDie', die: d.die, target })));
  await expect(page.locator('.targetable')).toHaveCount(0);
  problems.assertClean();
});

test('each die has a padlock of at least 44x44 directly under it', async ({ page }) => {
  await openApp(page);
  const g = await reach(page, 'qa-pad', turnStart);
  const n = eng.dice(g).length;
  expect(n).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < n; i++) {
    const die = await page.getByTestId(`die-${i}`).boundingBox();
    const lock = await page.getByTestId(`lock-${i}`).boundingBox();
    if (!die || !lock) throw new Error(`missing box for ${i}`);
    expect(lock.width, `lock-${i} width`).toBeGreaterThanOrEqual(43.5);
    expect(lock.height, `lock-${i} height`).toBeGreaterThanOrEqual(43.5);
    // On the tightest layouts the padlock overlaps the foot of its die by up to 20 px, on purpose.
    expect(lock.y, `lock-${i} is below die-${i}`).toBeGreaterThanOrEqual(die.y + die.height - 24);
    expect(lock.y + lock.height / 2, `lock-${i} centre is under die-${i}'s centre`).toBeGreaterThan(die.y + die.height / 2);
    expect(Math.abs(lock.x + lock.width / 2 - (die.x + die.width / 2)), `lock-${i} is centred under die-${i}`).toBeLessThanOrEqual(8);
    await expect(page.getByTestId(`lock-${i}`)).toHaveAttribute('data-locked', 'false');
  }
});

test('"lock, lock, Reroll" is exactly 3 taps, keeps both locked faces and rerolls the other die', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  const after = (g: GameState): GameState => apply(apply(apply(g, { type: 'toggleLock', die: 0 }), { type: 'toggleLock', die: 1 }), { type: 'reroll' });
  const g = await reach(page, 'qa-lockroll', (s) => {
    if (!turnStart(s) || (s.run?.fight?.rerollsLeft ?? 0) < 1) return false;
    const d = eng.dice(s);
    if (d.length < 3 || d.slice(0, 3).some((x) => x.jammed)) return false;
    const a = after(s);
    return a.run?.fight?.dice[2]?.face !== s.run?.fight?.dice[2]?.face;
  });
  const t0 = tapsSoFar(page);
  await tap(page, 'lock-0');
  await expect(page.getByTestId('die-0')).toHaveAttribute('data-locked', 'true');
  await expect(page.getByTestId('lock-0')).toHaveAttribute('data-locked', 'true');
  await tap(page, 'lock-1');
  await tap(page, 'btn-reroll');
  await idle(page);
  expect(tapsSoFar(page) - t0, 'lock, lock, Reroll').toBe(3);
  const now = await state(page);
  expect(json(now)).toBe(json(after(g)));
  const f0 = g.run?.fight?.dice;
  const f1 = now.run?.fight?.dice;
  expect(f1?.[0]?.face, 'locked die 0 keeps its face').toBe(f0?.[0]?.face);
  expect(f1?.[1]?.face, 'locked die 1 keeps its face').toBe(f0?.[1]?.face);
  expect(f1?.[2]?.face, 'the unlocked die was rerolled').not.toBe(f0?.[2]?.face);
  expect(now.run?.fight?.rerollsLeft).toBe((g.run?.fight?.rerollsLeft ?? 0) - 1);
  // A padlock tapped again releases the die.
  await tap(page, 'lock-0');
  await expect(page.getByTestId('lock-0')).toHaveAttribute('data-locked', 'false');
  await expect(page.getByTestId('die-0')).toHaveAttribute('data-locked', 'false');
});

test('three single-target dice take exactly 3 taps, then End Turn', async ({ page }) => {
  const problems = watch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  const g = await reach(page, 'qa-budget', hasPlan3);
  const plan = directPlan(g, 3);
  if (!plan) throw new Error('no plan');
  const t0 = tapsSoFar(page);
  let cur = g;
  for (const a of plan.actions) {
    if (a.type !== 'useDie') throw new Error('plan is only uses');
    await expect(page.getByTestId(`die-${a.die}`)).toHaveAttribute('data-targets', a.target ? '1' : '0');
    await tap(page, `die-${a.die}`);
    await idle(page);
    cur = apply(cur, a);
    expect(json(await state(page))).toBe(json(cur));
  }
  expect(tapsSoFar(page) - t0, 'three dice, three taps').toBe(3);
  await tap(page, 'btn-end-turn');
  await idle(page);
  expect(tapsSoFar(page) - t0, 'three dice plus End Turn').toBe(4);
  await expect(page.getByTestId('confirm-end-turn')).toHaveCount(0);
  expect(json(await state(page))).toBe(json(apply(plan.end, { type: 'endTurn' })));
  problems.assertClean();
});

test('Undo after the first use restores rolling, the rerolls and the padlocks exactly; "Rolling over" shows meanwhile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await reach(page, 'qa-undo', (s) => turnStart(s) && (s.run?.fight?.rerollsLeft ?? 0) >= 2 && eng.dice(s).slice(0, 3).every((d) => !d.jammed) && eng.dice(s).some((d) => d.die !== 0 && d.die !== 1 && d.usable && !isBlank(d)));
  // Lock die 0 and reroll once, with real taps; then use a direct-or-targeted die other than 0 and 1.
  await tap(page, 'lock-0');
  await tap(page, 'btn-reroll');
  await idle(page);
  const rolling = await state(page);
  expect(rolling.run?.fight?.phase).toBe('rolling');
  const rerolls = rolling.run?.fight?.rerollsLeft ?? 0;
  expect(rerolls).toBeGreaterThanOrEqual(1);
  await tap(page, 'lock-1');
  const withLocks = await state(page);
  const dv = eng.dice(withLocks).find((d) => d.die > 1 && d.usable && !isBlank(d));
  if (!dv) throw new Error('no usable die');
  await expect(page.getByTestId('btn-reroll')).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('btn-undo')).toBeDisabled();
  await tap(page, `die-${dv.die}`);
  if (dv.needsTarget && dv.targets.length > 1) {
    const t = dv.targets[0];
    if (!t) throw new Error('no target');
    await tap(page, targetId(t));
  }
  await idle(page);
  const used = await state(page);
  expect(used.run?.fight?.phase, 'using the first die ends rolling').toBe('acting');
  await expect(page.getByTestId('btn-reroll')).toHaveAttribute('data-state', 'over');
  await expect(page.getByTestId('btn-reroll')).toContainText('Rolling over');
  await expect(page.getByTestId('hint-line')).toContainText('Undo brings your rerolls back');
  for (let i = 0; i < eng.dice(used).length; i++) await expect(page.getByTestId(`lock-${i}`), `padlock ${i} fades away`).toHaveClass(/gone/);
  await expect(page.getByTestId('btn-undo')).toBeEnabled();

  await tap(page, 'btn-undo');
  await idle(page);
  const undone = await state(page);
  expect(json(undone), 'Undo brings back exactly the state before the die was used').toBe(json(withLocks));
  expect(undone.run?.fight?.rerollsLeft).toBe(withLocks.run?.fight?.rerollsLeft);
  expect(undone.run?.fight?.phase).toBe('rolling');
  await expect(page.getByTestId('btn-reroll')).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('btn-reroll')).toHaveAttribute('data-rerolls', String(withLocks.run?.fight?.rerollsLeft));
  await expect(page.getByTestId('lock-0')).toHaveAttribute('data-locked', 'true');
  await expect(page.getByTestId('lock-1')).toHaveAttribute('data-locked', 'true');
  await expect(page.getByTestId('lock-0')).not.toHaveClass(/gone/);
  await expect(page.getByTestId('btn-undo')).toBeDisabled();
});

test('a jammed die shows the chain and can neither be unlocked nor rerolled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  const g = await reach(page, 'qa-jam', jammedDie);
  const di = eng.dice(g).find((d) => d.jammed)?.die;
  if (di === undefined) throw new Error('no jammed die');
  const lock = page.getByTestId(`lock-${di}`);
  await expect(lock).toHaveAttribute('data-jammed', 'true');
  await expect(lock).toHaveClass(/chain/);
  const box = await lock.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(43.5);
  await tap(page, `lock-${di}`);
  await expect(page.getByTestId('hint-line')).toContainText(/Jammed/i);
  expect(json(await state(page)), 'tapping the chain changes nothing').toBe(json(g));
  if (eng.canApply(g, { type: 'reroll' })) {
    await tap(page, 'btn-reroll');
    await idle(page);
    expect((await state(page)).run?.fight?.dice[di]?.face, 'the jammed die kept its face').toBe(g.run?.fight?.dice[di]?.face);
  }
});

test('a pure blank never dispatches: the die shakes and the hint says why', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  const g = await reach(page, 'qa-blank', blankShowing);
  const di = eng.dice(g).findIndex((d) => d.effect === 'blank' && !d.cursed);
  await expect(page.getByTestId(`die-${di}`)).toHaveClass(/blank/);
  await expect(page.getByTestId(`die-${di}`)).toHaveAttribute('data-effect', 'blank');
  await tap(page, `die-${di}`);
  await idle(page);
  await expect(page.getByTestId('hint-line')).toContainText('Blank: nothing to use');
  expect(json(await state(page)), 'a blank never uses anything').toBe(json(g));
  await expect(page.getByTestId(`die-${di}`)).not.toHaveClass(/selected/);
});

test('long-press peeks at a die without using it, and shows previews on its targets', async ({ page }) => {
  await openApp(page);
  const g = await reach(page, 'qa-one', hasOneTarget);
  const d = findOne(g);
  const t = d?.targets[0];
  if (!d || !t) throw new Error('no die');
  const box = await page.getByTestId(`die-${d.die}`).boundingBox();
  if (!box) throw new Error('no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500); // a long press is a held finger: the hold time is the thing being tested
  await page.mouse.up();
  await expect(page.getByTestId('info-die')).toBeVisible();
  await expect(page.getByTestId('peek-lines')).toBeVisible();
  await expect(page.getByTestId(t.side === 'enemy' ? `preview-enemy-${t.uid}` : `preview-hero-${t.index}`)).toBeVisible();
  expect(json(await state(page)), 'peeking uses nothing').toBe(json(g));
  await page.getByTestId('info-close').tap();
  await idle(page);
  await expect(page.getByTestId('info-die')).toHaveCount(0);
  expect(json(await state(page))).toBe(json(g));
});

test('"Always choose the target myself": a single-target die lifts and waits for the target tap', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, { prefs: { installTipDismissed: true, chooseTarget: true } });
  const g = await reach(page, 'qa-one', hasOneTarget);
  expect((await readPrefs(page))['chooseTarget']).toBe(true);
  const d = findOne(g);
  const t = d?.targets[0];
  if (!d || !t) throw new Error('no die');
  const t0 = tapsSoFar(page);
  await tap(page, `die-${d.die}`);
  await expect(page.getByTestId(`die-${d.die}`)).toHaveClass(/selected/);
  expect(json(await state(page)), 'the first tap only lifts the die').toBe(json(g));
  await expect(page.getByTestId(targetId(t))).toHaveClass(/targetable/);
  await tap(page, targetId(t));
  await idle(page);
  expect(tapsSoFar(page) - t0).toBe(2);
  expect(json(await state(page))).toBe(json(apply(g, { type: 'useDie', die: d.die, target: t })));
  // A die that needs no target still fires on one tap.
  const h = await reach(page, 'qa-none', hasNoTarget);
  const n = findNone(h);
  if (!n) throw new Error('no no-target die');
  await tap(page, `die-${n.die}`);
  await idle(page);
  expect(json(await state(page))).toBe(json(apply(h, { type: 'useDie', die: n.die })));
});

test('the setting is off by default and the Settings switch turns it on and keeps it across a reload', async ({ page }) => {
  await openApp(page);
  expect((await readPrefs(page))['chooseTarget'] ?? false).toBe(false);
  await page.getByTestId('btn-settings').tap();
  await expect(page.getByTestId('btn-choose-target')).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('btn-choose-target').tap();
  await expect(page.getByTestId('btn-choose-target')).toHaveAttribute('aria-checked', 'true');
  expect((await readPrefs(page))['chooseTarget']).toBe(true);
  await page.reload();
  await page.getByTestId('btn-settings').tap();
  await expect(page.getByTestId('btn-choose-target')).toHaveAttribute('aria-checked', 'true');
});

test('rapid taps are queued, not dropped (normal motion)', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  const g = await reach(page, 'qa-budget', hasPlan3);
  const plan = directPlan(g, 3);
  if (!plan) throw new Error('no plan');
  // Fire the three taps back to back without waiting for any animation between them.
  for (const a of plan.actions) {
    if (a.type !== 'useDie') throw new Error('uses only');
    await page.getByTestId(`die-${a.die}`).tap({ noWaitAfter: true });
  }
  await idle(page);
  expect(json(await state(page)), 'all three dice were used, in order').toBe(json(plan.end));
  problems.assertClean();
});

for (const mode of [
  { name: 'normal motion', reduced: false, limit: 450 },
  { name: 'reduced motion', reduced: true, limit: 150 },
]) {
  test(`the next tap is accepted within ${mode.limit} ms of a die use (${mode.name})`, async ({ page }) => {
    if (mode.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await openApp(page, {
      // Test-only observer: remember when the game state first shows 1 and 2 dice used.
      init: `window.__qaT = { d1: 0, d2: 0 };
        (function poll() {
          try { const g = window.__pip && window.__pip.getState(); const f = g && g.run && g.run.fight;
            if (f) { const n = f.diceUsed; const t = performance.now(); if (n >= 1 && !window.__qaT.d1) window.__qaT.d1 = t; if (n >= 2 && !window.__qaT.d2) window.__qaT.d2 = t; } } catch (e) {}
          requestAnimationFrame(poll);
        })();`,
    });
    const g = await reach(page, 'qa-budget', hasPlan3);
    const plan = directPlan(g, 2);
    if (!plan) throw new Error('no plan');
    const ids = plan.actions.map((a) => (a.type === 'useDie' ? a.die : -1));
    // Both taps arrive in the same instant (inside the page, so test-runner round trips add no time):
    // the second one must wait for the first use to finish, and then run. The gap between the two
    // uses is exactly how long the app holds input after a use.
    await page.evaluate((list) => {
      for (const i of list) (document.querySelector(`[data-testid="die-${i}"]`) as HTMLElement).click();
    }, ids);
    await idle(page);
    const t = await page.evaluate(() => (window as unknown as { __qaT: { d1: number; d2: number } }).__qaT);
    expect(t.d1, 'first use seen').toBeGreaterThan(0);
    expect(t.d2, 'second use seen').toBeGreaterThan(0);
    // Frame timing and the tap round trip add a few ms of noise; the limit is the spec's.
    expect(t.d2 - t.d1, `time from one use to the next accepted tap (${mode.name})`).toBeLessThanOrEqual(mode.limit);
  });
}
