/**
 * Fairness checks (design.md 9.3), run against the real engine:
 *  A. No encounter can wipe a full-HP starter party within its first 2 turns, even if the player does nothing.
 *  B. No Act 1 enemy turn deals more than 60% of a full-HP starter hero's max HP to that hero:
 *     checked on paper (every starting enemy using its hardest-hitting move on the same hero) and
 *     in play (the first 3 enemy turns with the player doing nothing, every party order, many seeds).
 *  C. The tutorial fight cannot down a hero in under 6 turns, even if the player does nothing.
 * To fight a chosen encounter through the public interface, each check builds an engine whose
 * tutorial is that encounter.
 */
import { createEngine } from '@engine';
import type { ContentDB, EncounterDef, EnemyDef, GameState, HeroId } from '@shared';
import { STARTER_HEROES } from '@shared';

export interface FairnessLine {
  name: string;
  pass: boolean;
  detail: string;
}

const ORDERS: [number, number, number][] = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

/** Most damage one move of this enemy can put on a single hero in one enemy turn (poison it applies ticks the same turn). */
export function worstMoveOnOneHero(e: EnemyDef): number {
  let worst = 0;
  for (const m of e.moves) {
    let dmg = 0;
    for (const a of m.actions) if (a.type === 'attack') dmg += a.amount * (a.hits ?? 1) + (a.poison ?? 0);
    if (dmg > worst) worst = dmg;
  }
  return worst;
}

function doNothing(content: ContentDB, enc: EncounterDef, heroes: [HeroId, HeroId, HeroId], seed: string, turns: number): { wiped: boolean; worstPct: number; worst: string; downedOnTurn: number } {
  const engine = createEngine({ ...content, tutorial: { seed, heroes, encounter: enc } });
  let game: GameState = engine.newGame();
  game = engine.apply(game, { type: 'startTutorial' }).game;
  let worstPct = 0;
  let worst = '';
  let downedOnTurn = 0;
  for (let t = 1; t <= turns; t++) {
    const run = game.run;
    if (!run || run.phase !== 'fight') break;
    const before = run.heroes.map((h) => (h.downed ? 0 : h.hp));
    game = engine.apply(game, { type: 'endTurn' }).game;
    const after = game.run!;
    after.heroes.forEach((h, i) => {
      const lost = before[i]! - (h.downed ? 0 : h.hp);
      const pct = (lost * 100) / h.maxHp;
      if (pct > worstPct) { worstPct = pct; worst = `${h.heroId} lost ${lost} of ${h.maxHp} on turn ${t}`; }
      if (h.downed && before[i]! > 0 && downedOnTurn === 0) downedOnTurn = t;
    });
    if (after.phase === 'defeat') return { wiped: true, worstPct, worst, downedOnTurn };
  }
  return { wiped: false, worstPct, worst, downedOnTurn };
}

export function checkFairness(content: ContentDB, seeds: number): FairnessLine[] {
  const starters = STARTER_HEROES.slice() as HeroId[];
  const orders = ORDERS.map((o) => o.map((i) => starters[i]!) as [HeroId, HeroId, HeroId]);
  const minHp = Math.min(...content.heroes.filter((h) => h.starter).map((h) => h.maxHp));
  const lines: FairnessLine[] = [];

  // A: no 2-turn wipe, every encounter.
  let wipes = 0;
  const wipedIn = new Map<string, number>();
  let fights = 0;
  for (const enc of content.encounters) {
    for (const party of orders) {
      for (let s = 0; s < seeds; s++) {
        fights++;
        const r = doNothing(content, enc, party, `fair-${enc.id}-${s}`, 2);
        if (r.wiped) { wipes++; wipedIn.set(enc.id, (wipedIn.get(enc.id) ?? 0) + 1); }
      }
    }
  }
  lines.push({
    name: 'No encounter wipes a full-HP starter party in 2 turns (doing nothing)',
    pass: wipes === 0,
    detail: wipes === 0 ? `${content.encounters.length} encounters x 6 party orders x ${seeds} seeds = ${fights} fights, 0 wipes` : `${wipes} wipes: ${[...wipedIn.entries()].map(([id, n]) => `${id} x${n}`).join(', ')}`,
  });

  // B (paper): every starting enemy's worst move on the same hero.
  const limit = 0.6 * minHp;
  let worstStatic = 0;
  let worstStaticEnc = '';
  for (const enc of content.encounters.filter((e) => e.act === 1)) {
    let sum = 0;
    for (const id of enc.enemies) {
      const def = content.enemies.find((e) => e.id === id);
      if (def) sum += worstMoveOnOneHero(def);
    }
    if (sum > worstStatic) { worstStatic = sum; worstStaticEnc = enc.id; }
  }
  lines.push({
    name: 'Act 1 worst case on paper: one enemy turn <= 60% of a starter hero',
    pass: worstStatic <= limit,
    detail: `worst is ${worstStatic} damage (${worstStaticEnc}); limit ${limit.toFixed(1)} = 60% of the frailest starter (${minHp} HP)`,
  });

  // B (in play): first 3 enemy turns of every Act 1 encounter.
  let worstPct = 0;
  let worstWhere = '';
  for (const enc of content.encounters.filter((e) => e.act === 1)) {
    for (const party of orders) {
      for (let s = 0; s < seeds; s++) {
        const r = doNothing(content, enc, party, `fair1-${enc.id}-${s}`, 3);
        if (r.worstPct > worstPct) { worstPct = r.worstPct; worstWhere = `${enc.id}: ${r.worst}`; }
      }
    }
  }
  lines.push({
    name: 'Act 1 in play: no enemy turn deals more than 60% of a hero (first 3 turns)',
    pass: worstPct <= 60,
    detail: `worst seen ${worstPct.toFixed(0)}% (${worstWhere})`,
  });

  // C: tutorial.
  let earliest = 99;
  for (let s = 0; s < seeds; s++) {
    const r = doNothing(content, content.tutorial.encounter, content.tutorial.heroes, `tut-${s}`, 6);
    if (r.downedOnTurn > 0 && r.downedOnTurn < earliest) earliest = r.downedOnTurn;
  }
  lines.push({
    name: 'Tutorial fight cannot down a hero in under 6 turns (doing nothing)',
    pass: earliest >= 6,
    detail: earliest === 99 ? 'no hero downed in 6 turns' : `earliest hero downed on turn ${earliest}`,
  });
  return lines;
}
