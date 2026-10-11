/** Predicates that find interesting fight states (for pathTo) without naming any content. */
import type { GameState } from '@shared';
import { eng } from './app';

type Pred = (g: GameState) => boolean;

const fight = (g: GameState) => (g.run?.phase === 'fight' ? g.run.fight : null);

/** Start of a player turn: rolling phase, nothing spent or used yet. */
export const turnStart: Pred = (g) => {
  const f = fight(g);
  return !!f && f.phase === 'rolling' && f.rerollsSpent === 0 && f.diceUsed === 0;
};

export const trickIntent =
  (type: 'lockDie' | 'curseFace' | 'stealReroll'): Pred =>
  (g) => {
    const f = fight(g);
    return turnStart(g) && !!f && f.enemies.some((e) => e.hp > 0 && e.intent?.actions.some((a) => a.type === type));
  };

export const jammedDie: Pred = (g) => turnStart(g) && eng.dice(g).some((d) => d.jammed);
export const cursedShowing: Pred = (g) => turnStart(g) && eng.dice(g).some((d) => d.cursed);
export const blankShowing: Pred = (g) => turnStart(g) && eng.dice(g).some((d) => d.effect === 'blank' && !d.cursed);
export const fourEnemies: Pred = (g) => turnStart(g) && (fight(g)?.enemies.filter((e) => e.hp > 0).length ?? 0) >= 4;
export const bossOfAct =
  (act: number): Pred =>
  (g) =>
    turnStart(g) && g.run?.act === act && fight(g)?.kind === 'boss';
export const heroHasItem: Pred = (g) => turnStart(g) && !!g.run?.heroes.some((h) => h.items.length > 0);
