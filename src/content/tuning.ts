/**
 * Difficulty dials. Enemy files are written in "base" numbers; these per-act multipliers are
 * applied once when the content is assembled, so one edit here retunes a whole act.
 * Act 1 attack must stay at 1: fairness rule 9.3 caps how hard Act 1 may hit one hero.
 */
import type { EnemyAction, EnemyDef } from '@shared';

const HP_MULT: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.12, 3: 1.25 };
const ATK_MULT: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.25, 3: 1.3 };

export function scaleHp(act: 1 | 2 | 3, hp: number): number {
  return Math.max(1, Math.round(hp * HP_MULT[act]));
}

export function scaleAtk(act: 1 | 2 | 3, amount: number): number {
  return Math.max(1, Math.round(amount * ATK_MULT[act]));
}

function tuneAction(act: 1 | 2 | 3, a: EnemyAction): EnemyAction {
  return a.type === 'attack' ? { ...a, amount: scaleAtk(act, a.amount) } : a;
}

/** Applies the act's dials to enemies written in base numbers. */
export function tune(defs: EnemyDef[]): EnemyDef[] {
  return defs.map((e) => ({
    ...e,
    hp: scaleHp(e.act, e.hp),
    moves: e.moves.map((m) => ({ ...m, actions: m.actions.map((a) => tuneAction(e.act, a)) })),
  }));
}
