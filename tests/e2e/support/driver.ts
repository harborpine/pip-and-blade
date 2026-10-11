/**
 * Performs an engine Action through the real UI with real taps, then checks that the app's state
 * is exactly what the rules engine says it should be.
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Action, GameState, RewardOption, TargetRef } from '@shared';
import { eng, idle, readPrefs, state, tap } from './app';

async function visible(page: Page, testid: string): Promise<boolean> {
  return page.getByTestId(testid).first().isVisible();
}

const tapId = (page: Page, testid: string): Promise<void> => tap(page, testid);

export const targetId = (t: TargetRef): string => (t.side === 'enemy' ? `enemy-${t.uid}` : `hero-${t.index}`);

async function chooseHeroAndFace(page: Page, hero: number, face: number): Promise<void> {
  await tapId(page, `place-hero-${hero}`);
  await tapId(page, `face-slot-${face}`);
}

/** Tap the controls that perform `a`. `g` is the state the action is taken from. */
export async function tapAction(page: Page, g: GameState, a: Action): Promise<void> {
  const run = g.run;
  if (!run) throw new Error('no run');
  switch (a.type) {
    case 'toggleLock':
      // 0.2.0: the padlock under the die (tapping the die would USE it).
      await tapId(page, `lock-${a.die}`);
      return;
    case 'reroll':
      await tapId(page, 'btn-reroll');
      return;
    case 'useDie': {
      // 0.2.0: no modes. A die needing no target or having exactly one is used by ONE tap; with
      // several targets the die lifts and a second tap on the target uses it.
      const dv = eng.dice(g).find((d) => d.die === a.die);
      if (!dv) throw new Error(`no die ${a.die}`);
      const expectTargets = dv.needsTarget ? dv.targets.length : 0;
      const shown = Number(await page.getByTestId(`die-${a.die}`).getAttribute('data-targets'));
      expect(shown, `die-${a.die} data-targets equals the rules engine's target count`).toBe(expectTargets);
      const choose = (await readPrefs(page))['chooseTarget'] === true;
      const direct = expectTargets === 0 || (expectTargets === 1 && !choose);
      await tapId(page, `die-${a.die}`);
      if (direct) {
        if (a.target) expect(a.target, 'the lone target is the one used').toEqual(dv.targets[0]);
      } else {
        if (!a.target) throw new Error('several targets but the action names none');
        await tapId(page, targetId(a.target));
      }
      return;
    }
    case 'undo':
      await tapId(page, 'btn-undo');
      return;
    case 'endTurn':
      await tapId(page, 'btn-end-turn');
      if (await visible(page, 'confirm-end-turn')) await tapId(page, 'confirm-end-turn-confirm');
      return;
    case 'pickReward': {
      const opt: RewardOption | undefined = run.reward?.options[a.option];
      await tapId(page, `reward-option-${a.option}`);
      if (!opt) return;
      if (opt.type === 'item') {
        await tapId(page, `place-hero-${a.hero ?? 0}`);
        if (a.replaceItem !== undefined) await tapId(page, `replace-item-${a.replaceItem}`);
      } else {
        await tapId(page, `face-slot-${a.face ?? 0}`);
      }
      return;
    }
    case 'skipReward':
      await tapId(page, 'btn-skip-reward');
      return;
    case 'pickDoor':
      await tapId(page, `door-${a.door}`);
      return;
    case 'restHeal':
      await tapId(page, 'btn-rest-heal');
      return;
    case 'restUpgrade':
      await tapId(page, 'btn-rest-upgrade');
      await chooseHeroAndFace(page, a.hero, a.face);
      return;
    case 'shopBuy': {
      const slot = run.shop?.slots[a.slot];
      await tapId(page, `shop-slot-${a.slot}`);
      if (!slot) return;
      if (slot.type === 'item') {
        await tapId(page, `place-hero-${a.hero ?? 0}`);
        if (a.replaceItem !== undefined) await tapId(page, `replace-item-${a.replaceItem}`);
      } else if (slot.type === 'face') {
        await tapId(page, `face-slot-${a.face ?? 0}`);
      } else if (slot.type === 'upgrade') {
        await chooseHeroAndFace(page, a.hero ?? 0, a.face ?? 0);
      }
      return;
    }
    case 'leave':
      await tapId(page, 'btn-leave');
      return;
    case 'eventChoice':
      await tapId(page, `event-choice-${a.choice}`);
      return;
    case 'continue':
      await tapId(page, 'btn-continue');
      return;
    case 'abandonRun':
    case 'startRun':
    case 'startDaily':
    case 'startTutorial':
      throw new Error(`${a.type} is not driven through the bot`);
  }
}

/**
 * Tap `a`, wait for the animations to settle, and assert the app now holds exactly the state the
 * engine predicts for that action. Returns the new state.
 */
export async function perform(page: Page, g: GameState, a: Action): Promise<GameState> {
  const expected = eng.apply(g, a).game;
  await tapAction(page, g, a);
  await idle(page);
  const actual = await state(page);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    // Produce a readable failure: show the first differing top-level run field.
    const ar = actual.run as unknown as Record<string, unknown> | null;
    const er = expected.run as unknown as Record<string, unknown> | null;
    const diffs = ar && er ? Object.keys(er).filter((k) => JSON.stringify(ar[k]) !== JSON.stringify(er[k])) : ['run'];
    expect(JSON.stringify(a) + ' -> differing run fields: ' + diffs.join(','), 'UI state differs from engine prediction').toBe('ok');
  }
  return actual;
}
