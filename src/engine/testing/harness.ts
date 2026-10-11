/** Test helpers: build a fight in an exact state, drive it, and play random legal runs. */
import type { Action, ContentDB, EncounterDef, EnemyId, GameState, HeroId, ItemId, TargetRef } from '@shared';
import { beginFight } from '../combat';
import { clone, makeCtx } from '../ctx';
import { buildDb } from '../db';
import type { EngineX } from '../index';
import { createEngine } from '../index';
import { newProfile } from '../meta';
import { pureInt } from '../rng';
import { createRun, giveItem, settle } from '../run';
import { content as baseContent } from './fixtures';

export interface FightSetup {
  content?: ContentDB;
  heroes?: HeroId[];
  /** Items per hero, given before the fight starts (so fightStart effects apply). */
  items?: ItemId[][];
  /** Starting HP per hero (after items). */
  hp?: number[];
  /** Enemies to fight (default: the content's first encounter). */
  enemies?: EnemyId[];
  kind?: EncounterDef['kind'];
  tier?: number;
  seed?: string;
}

/** A game sitting at turn 1 of a fight, rolling phase. */
export function fight(s: FightSetup = {}): { engine: EngineX; game: GameState } {
  const content = s.content ?? baseContent();
  const db = buildDb(content);
  const c = makeCtx(db, { profile: newProfile(db), run: null }, true);
  createRun(c, s.heroes ?? content.heroes.slice(0, content.rules.partySize).map((h) => h.id), s.tier ?? 0, s.seed ?? 'test', 'standard', null);
  (s.items ?? []).forEach((list, hi) => list.forEach((id) => giveItem(c, hi, id, undefined)));
  c.run.stats.run = {};
  (s.hp ?? []).forEach((hp, hi) => { c.run.heroes[hi]!.hp = hp; });
  const first = content.encounters[0]!;
  const enc: EncounterDef = s.enemies ? { id: 'test', act: 1, kind: s.kind ?? 'normal', enemies: s.enemies } : first;
  beginFight(c, enc, s.kind ?? enc.kind);
  settle(c);
  return { engine: createEngine(content), game: c.game };
}

/** A copy of the game with the dice showing the given face indexes (die order). */
export function withFaces(game: GameState, faces: number[]): GameState {
  const g = clone(game);
  faces.forEach((f, i) => { g.run!.fight!.dice[i]!.face = f; });
  return g;
}

export const foe = (game: GameState, i = 0): TargetRef => ({ side: 'enemy', uid: game.run!.fight!.enemies[i]!.uid });
export const ally = (index: number): TargetRef => ({ side: 'hero', index });

/** Applies actions in order and returns the final game. */
export function play(engine: EngineX, game: GameState, ...actions: Action[]): GameState {
  let g = game;
  for (const a of actions) g = engine.apply(g, a).game;
  return g;
}

export const use = (die: number, target?: TargetRef): Action => ({ type: 'useDie', die, target });
export const END: Action = { type: 'endTurn' };

/** Plays seeded random legal actions until the run ends (or the step cap). Returns the last state and the step count. */
export function randomRun(engine: EngineX, start: GameState, seed: string, maxSteps = 5000, each?: (g: GameState, a: Action, step: number) => void): { game: GameState; steps: number } {
  let g = start;
  let steps = 0;
  while (steps < maxSteps) {
    const acts = engine.legalActions(g);
    if (!acts.length) break;
    const a = acts[pureInt(seed, 'bot', steps, acts.length)]!;
    if (each) each(g, a, steps);
    g = engine.apply(g, a).game;
    steps++;
    if (!g.run) break;
  }
  return { game: g, steps };
}

/** Skips rewards, takes the first door and leaves rooms until the next fight (or the run's end). */
export function toNextFight(engine: EngineX, game: GameState): GameState {
  let g = game;
  for (let i = 0; i < 50 && g.run && g.run.phase !== 'fight' && g.run.phase !== 'victory' && g.run.phase !== 'defeat'; i++) {
    const acts = engine.legalActions(g);
    const a = acts.find((x) => x.type === 'skipReward' || x.type === 'leave') ?? acts.find((x) => x.type === 'pickDoor' || x.type === 'eventChoice');
    if (!a) break;
    g = engine.apply(g, a).game;
  }
  return g;
}

/** Wins the current fight by force: every enemy is reduced to 1 HP with an empty intent, then killed. */
export function forceWin(engine: EngineX, game: GameState): GameState {
  let g = clone(game);
  const encounter = g.run!.fight!.encounterId;
  const wins = g.run!.fightsWon;
  for (let i = 0; i < 40; i++) {
    const f = g.run?.fight;
    if (!f || g.run!.fightsWon !== wins || f.encounterId !== encounter) return g;
    for (const e of f.enemies) { e.hp = 1; e.shield = 0; e.statuses = {}; e.intent = { moveId: '', moveName: '', actions: [] }; }
    const die = engine.dice(g).find((d) => d.usable && (d.effect === 'damage' || !d.needsTarget));
    const target = die && die.needsTarget ? die.targets[0] : undefined;
    g = clone(engine.apply(g, die ? { type: 'useDie', die: die.die, target } : { type: 'endTurn' }).game);
  }
  throw new Error('could not win the fight');
}

/** Plays a whole run to victory by force, skipping rewards and taking the first door. */
export function forceRun(engine: EngineX, game: GameState): GameState {
  let g = game;
  for (let i = 0; i < 80; i++) {
    if (!g.run || g.run.phase === 'victory' || g.run.phase === 'defeat') return g;
    g = g.run.phase === 'fight' ? forceWin(engine, g) : toNextFight(engine, g);
  }
  return g;
}
