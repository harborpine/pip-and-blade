/**
 * A competent-enough player bot. It only DECIDES: given a GameState it returns the next engine
 * Action. The Playwright specs then PERFORM that action with real taps (see ./driver.ts), and the
 * node seed-search script (./find-seed.ts) runs the same decisions headless against the engine.
 *
 * Nothing here knows content ids or numbers: everything is read from the state and the engine.
 */
import type { Action, DieView, DoorKind, FaceState, GameState, RunState, TargetRef } from '@shared';
import type { Engine } from '@shared';

const FACE_WEIGHT: Record<string, number> = { damage: 1, shield: 0.8, heal: 0.6, weaken: 0.5, focus: 1.2, blank: 0 };

export interface BotOptions {
  /** A die showing at least this "power" is locked while rerolling. */
  lockAt: number;
}
export const DEFAULT_BOT: BotOptions = { lockAt: 4 };

function dieSpell(d: DieView): number {
  if (d.cursed) return 0;
  return (FACE_WEIGHT[d.effect] ?? 0) * d.value + (d.keywords.length > 0 ? 1 : 0);
}

function facePower(f: FaceState): number {
  return (FACE_WEIGHT[f.effect] ?? 0) * f.value + f.keywords.length * 0.8;
}

function runValue(eng: Engine, run: RunState): number {
  let v = run.gold * 0.25;
  for (const h of run.heroes) {
    v += h.hp * 0.5;
    v += h.items.length * 3;
    for (const f of h.faces) v += facePower(f);
  }
  void eng;
  return v;
}

interface FightMetrics {
  incoming: number;
  enemyHp: number;
  enemyShield: number;
  enemies: number;
  heroHp: number;
  downed: number;
  statuses: number;
  rerolls: number;
}

function metrics(eng: Engine, g: GameState): FightMetrics {
  const run = g.run as RunState;
  const f = run.fight;
  if (!f || run.phase !== 'fight') return { incoming: 0, enemyHp: 0, enemyShield: 0, enemies: 0, heroHp: 0, downed: 0, statuses: 0, rerolls: 0 };
  const fc = eng.forecast(g);
  const living = f.enemies.filter((e) => e.hp > 0);
  let statuses = 0;
  for (const e of living) for (const n of Object.values(e.statuses)) statuses += n ?? 0;
  return {
    incoming: fc.heroes.reduce((s, x) => s + x.hpLoss, 0) + fc.heroes.filter((x) => x.downed).length * 4 + (fc.partyWipe ? 100 : 0),
    enemyHp: living.reduce((s, e) => s + e.hp, 0),
    enemyShield: living.reduce((s, e) => s + e.shield, 0),
    enemies: living.length,
    heroHp: run.heroes.reduce((s, h) => s + h.hp, 0),
    downed: run.heroes.filter((h) => h.downed).length,
    statuses,
    rerolls: f.nextTurnRerolls,
  };
}

/** The best die+target to use next, or null if nothing is worth doing. */
function bestUse(eng: Engine, g: GameState): Action | null {
  const before = metrics(eng, g);
  let best: { score: number; action: Action } | null = null;
  for (const dv of eng.dice(g)) {
    if (!dv.usable) continue;
    const options: (TargetRef | undefined)[] = dv.needsTarget ? dv.targets : [undefined];
    for (const t of options) {
      const action: Action = t ? { type: 'useDie', die: dv.die, target: t } : { type: 'useDie', die: dv.die };
      let g2: GameState;
      try {
        g2 = eng.apply(g, action).game;
      } catch {
        continue;
      }
      const after = g2.run?.phase === 'fight' ? metrics(eng, g2) : null;
      let score: number;
      if (!after) {
        score = 1000; // the fight is over: that was the winning blow
      } else {
        score =
          (before.incoming - after.incoming) * 1.5 +
          (before.enemyHp - after.enemyHp) +
          (before.enemyShield - after.enemyShield) * 0.3 +
          (before.enemies - after.enemies) * 4 +
          (after.heroHp - before.heroHp) * 0.8 +
          (after.statuses - before.statuses) * 0.5 +
          (after.rerolls - before.rerolls) * 1 -
          (after.downed - before.downed) * 6;
      }
      if (!best || score > best.score) best = { score, action };
    }
  }
  return best && best.score > 0.01 ? best.action : null;
}

function fightAction(eng: Engine, g: GameState, opt: BotOptions): Action {
  const run = g.run as RunState;
  const f = run.fight;
  if (!f) return { type: 'endTurn' };
  if (f.phase === 'rolling' && f.rerollsLeft > 0) {
    const free = eng.dice(g).filter((d) => !d.locked && !d.jammed && !d.used);
    const keep = free.find((d) => dieSpell(d) >= opt.lockAt);
    if (keep) return { type: 'toggleLock', die: keep.die };
    if (free.length > 0 && eng.canApply(g, { type: 'reroll' })) return { type: 'reroll' };
  }
  return bestUse(eng, g) ?? { type: 'endTurn' };
}

const DOOR_VALUE: Record<DoorKind, (r: RunState) => number> = {
  treasure: () => 5,
  rest: (r) => {
    const miss = r.heroes.reduce((s, h) => s + (h.maxHp - h.hp), 0) / Math.max(1, r.heroes.reduce((s, h) => s + h.maxHp, 0));
    return 1 + miss * 12;
  },
  shop: (r) => 2 + Math.min(4, r.gold / 20),
  event: () => 2,
  onward: () => 1,
  elite: () => 0.5,
};

function bestByLookahead(eng: Engine, g: GameState, candidates: Action[], fallback: Action): Action {
  const run = g.run as RunState;
  let best: { score: number; action: Action } | null = null;
  for (const a of candidates) {
    let g2: GameState;
    try {
      g2 = eng.apply(g, a).game;
    } catch {
      continue;
    }
    const r2 = g2.run;
    const score = r2 ? runValue(eng, r2) : runValue(eng, run);
    if (!best || score > best.score) best = { score, action: a };
  }
  const base = runValue(eng, run);
  // Only deviate from the fallback (usually "leave") when it is a real improvement.
  return best && best.score > base + 0.05 ? best.action : fallback;
}

/** Decide the next engine action for any state with a run in progress. */
export function nextAction(eng: Engine, g: GameState, opt: BotOptions = DEFAULT_BOT): Action {
  const run = g.run;
  if (!run) throw new Error('No run');
  switch (run.phase) {
    case 'fight':
      return fightAction(eng, g, opt);
    case 'reward': {
      const legal = eng.legalActions(g).filter((a) => a.type === 'pickReward');
      return bestByLookahead(eng, g, legal, { type: 'skipReward' });
    }
    case 'doors': {
      let best = 0;
      let score = -1;
      (run.doors ?? []).forEach((d, i) => {
        const s = DOOR_VALUE[d.kind](run);
        if (s > score) {
          score = s;
          best = i;
        }
      });
      return { type: 'pickDoor', door: best };
    }
    case 'rest': {
      if (run.rest?.used) return { type: 'leave' };
      const legal = eng.legalActions(g).filter((a) => a.type === 'restHeal' || a.type === 'restUpgrade');
      return bestByLookahead(eng, g, legal, { type: 'leave' });
    }
    case 'shop': {
      const legal = eng.legalActions(g).filter((a) => a.type === 'shopBuy');
      return bestByLookahead(eng, g, legal, { type: 'leave' });
    }
    case 'event': {
      if (run.event?.chosen !== null && run.event?.chosen !== undefined) return { type: 'leave' };
      const legal = eng.legalActions(g).filter((a) => a.type === 'eventChoice');
      return bestByLookahead(eng, g, legal, legal[0] ?? { type: 'leave' });
    }
    case 'victory':
    case 'defeat':
      return { type: 'continue' };
  }
}
