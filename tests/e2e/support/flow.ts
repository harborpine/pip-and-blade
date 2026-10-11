/** Helpers for the 0.2.0 dice flow: which dice are used by one tap, plans of single-tap turns, locating scenes. */
import type { Action, DieView, GameState } from '@shared';
import { eng } from './app';
import { turnStart } from './scenes';

export const isBlank = (d: DieView): boolean => d.effect === 'blank';
/** Usable, not a pure blank, and needing no target or having exactly one: one tap uses it. */
export const directDie = (d: DieView): boolean => d.usable && !isBlank(d) && (!d.needsTarget || d.targets.length === 1);
/** Usable, not blank, with several possible targets: lifts on the first tap. */
export const multiDie = (d: DieView): boolean => d.usable && !isBlank(d) && d.needsTarget && d.targets.length > 1;
/** Needs no target at all. */
export const noTargetDie = (d: DieView): boolean => d.usable && !isBlank(d) && !d.needsTarget;
/** Needs a target and has exactly one. */
export const oneTargetDie = (d: DieView): boolean => d.usable && !isBlank(d) && d.needsTarget && d.targets.length === 1;

export function useAction(d: DieView): Action {
  return d.needsTarget && d.targets[0] ? { type: 'useDie', die: d.die, target: d.targets[0] } : { type: 'useDie', die: d.die };
}

/**
 * `n` successive uses that are each a single tap when taken (and leave the fight running with
 * nobody downed by the forecast), or null if this hand has no such plan.
 */
export function directPlan(g: GameState, n: number): { actions: Action[]; end: GameState } | null {
  let cur = g;
  const actions: Action[] = [];
  for (let k = 0; k < n; k++) {
    const d = eng.dice(cur).find(directDie);
    if (!d) return null;
    const a = useAction(d);
    actions.push(a);
    cur = eng.apply(cur, a).game;
    if (cur.run?.phase !== 'fight') return null;
  }
  if (eng.forecast(cur).heroes.some((h) => h.downed)) return null;
  return { actions, end: cur };
}

export const hasDirect = (g: GameState): boolean => turnStart(g) && eng.dice(g).some(directDie);
/** A die of this kind exists whose use leaves the fight running (so the screen is still the fight afterwards). */
const survives = (g: GameState, pick: (d: DieView) => boolean): boolean =>
  turnStart(g) && eng.dice(g).some((d) => pick(d) && eng.apply(g, useAction(d)).game.run?.phase === 'fight');
export const hasNoTarget = (g: GameState): boolean => survives(g, noTargetDie);
export const hasOneTarget = (g: GameState): boolean => survives(g, oneTargetDie);
export const hasMulti = (g: GameState): boolean => turnStart(g) && eng.dice(g).some(multiDie);
export const hasPlan3 = (g: GameState): boolean => turnStart(g) && directPlan(g, 3) !== null;

const firstSurviving = (g: GameState, pick: (d: DieView) => boolean): DieView | undefined =>
  eng.dice(g).find((d) => pick(d) && eng.apply(g, useAction(d)).game.run?.phase === 'fight');
export const findOne = (g: GameState): DieView | undefined => firstSurviving(g, oneTargetDie);
export const findNone = (g: GameState): DieView | undefined => firstSurviving(g, noTargetDie);
