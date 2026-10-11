/** The working context of one engine call: a private copy of the state plus scratch flags. */
import type { EnemyId, FightState, GameEvent, GameState, HeroId, ItemId, Modifier, Profile, RunState, StatKey } from '@shared';
import type { Db } from './db';

export interface ActiveMod {
  m: Modifier;
  /** Index of the hero holding the item. */
  h: number;
}

export interface Ctx {
  db: Db;
  game: GameState;
  /** The run being worked on. Only valid while game.run is not null. */
  run: RunState;
  ev: GameEvent[];
  ownProfile: boolean;
  /** True for previews / forecasts: no profile or feat bookkeeping. */
  preview: boolean;
  /** 0 = fight continues, 1 = fight won, 2 = party wiped. */
  over: 0 | 1 | 2;
  enemyPhase: boolean;
  /** Shield each enemy (by uid) gained during the current enemy phase. */
  phaseShield: Record<number, number> | null;
  /**
   * Fury (Rules.fury) bookkeeping for shown attack amounts: 0 = the next enemy phase belongs to this
   * turn and Fury has not been applied yet, 1 = applied (amounts are final), 2 = choosing intents for next turn.
   */
  fury: 0 | 1 | 2;
  /** The die currently resolving. */
  cur: { die: number; blank: boolean } | null;
  depth: number;
  /** Rerolls stolen during this call (for the forecast). */
  stolen: number;
  dying: number[];
  mods: ActiveMod[] | null;
}

/** Deep copy of plain JSON data. */
export function clone<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) {
    const out: unknown[] = new Array(v.length);
    for (let i = 0; i < v.length; i++) out[i] = clone(v[i]);
    return out as T;
  }
  const src = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k in src) out[k] = clone(src[k]);
  return out as T;
}

function cloneFight(f: FightState): FightState {
  return {
    ...f,
    nextTurnJams: f.nextTurnJams.slice(),
    dice: f.dice.map((d) => ({ ...d })),
    heroes: f.heroes.map((h) => ({ shield: h.shield, ward: h.ward, statuses: { ...h.statuses }, growth: h.growth.slice(), cursed: h.cursed.slice() })),
    // Intents and sets are never mutated in place (they are replaced), so they are shared.
    enemies: f.enemies.map((e) => ({ ...e, statuses: { ...e.statuses } })),
    limits: { ...f.limits },
    undo: f.undo.slice(),
  };
}

/**
 * Copy of a run that is safe to mutate. Face arrays, reward options and door lists are shared
 * with the original: engine code replaces them instead of editing them in place.
 */
export function cloneRun(r: RunState): RunState {
  return {
    ...r,
    heroes: r.heroes.map((h) => ({ ...h, items: h.items.slice() })),
    fight: r.fight ? cloneFight(r.fight) : null,
    shop: r.shop ? { slots: r.shop.slots.map((s) => ({ ...s })) } : null,
    event: r.event ? { ...r.event } : null,
    rest: r.rest ? { ...r.rest } : null,
    stats: { turn: { ...r.stats.turn }, fight: { ...r.stats.fight }, run: { ...r.stats.run } },
    limits: { ...r.limits },
    rng: { ...r.rng },
    featsEarned: r.featsEarned.slice(),
  };
}

export function makeCtx(db: Db, game: GameState, mutable: boolean, preview = false): Ctx {
  const run = game.run ? (mutable ? cloneRun(game.run) : game.run) : null;
  return {
    db,
    game: mutable ? { profile: game.profile, run } : game,
    run: run as RunState,
    ev: [],
    ownProfile: false,
    preview,
    over: 0,
    enemyPhase: false,
    phaseShield: null,
    fury: 0,
    cur: null,
    depth: 0,
    stolen: 0,
    dying: [],
    mods: null,
  };
}

/** The profile, copied on first write so the caller's GameState is never touched. */
export function profile(c: Ctx): Profile {
  if (!c.ownProfile) {
    c.game.profile = clone(c.game.profile);
    c.ownProfile = true;
  }
  return c.game.profile;
}

/** Modifiers of every item held by a living hero. */
export function activeMods(c: Ctx): ActiveMod[] {
  if (c.mods) return c.mods;
  const out: ActiveMod[] = [];
  const heroes = c.run.heroes;
  for (let i = 0; i < heroes.length; i++) {
    const h = heroes[i]!;
    if (h.downed) continue;
    for (const id of h.items) {
      const ms = c.db.itemMods.get(id);
      if (ms) for (const m of ms) out.push({ m, h: i });
    }
  }
  c.mods = out;
  return out;
}

/** Sum of a numeric party-wide modifier over every held item, downed holders included (used between fights). */
export function sumAllMods(c: Ctx, type: 'returnHpPct' | 'goldGainPct' | 'shopDiscountPct' | 'healAfterFight'): number {
  let n = 0;
  for (const h of c.run.heroes) {
    for (const id of h.items) {
      const ms = c.db.itemMods.get(id);
      if (ms) for (const m of ms) if (m.type === type) n += m.amount;
    }
  }
  return n;
}

export function bump(c: Ctx, key: StatKey, n: number): void {
  if (n === 0) return;
  const s = c.run.stats;
  s.turn[key] = (s.turn[key] ?? 0) + n;
  s.fight[key] = (s.fight[key] ?? 0) + n;
  s.run[key] = (s.run[key] ?? 0) + n;
}

export function bumpMax(c: Ctx, key: StatKey, n: number): void {
  const s = c.run.stats;
  if (n > (s.turn[key] ?? 0)) s.turn[key] = n;
  if (n > (s.fight[key] ?? 0)) s.fight[key] = n;
  if (n > (s.run[key] ?? 0)) s.run[key] = n;
}

export function seen(c: Ctx, kind: 'heroes', id: HeroId): void;
export function seen(c: Ctx, kind: 'items', id: ItemId): void;
export function seen(c: Ctx, kind: 'enemies', id: EnemyId): void;
export function seen(c: Ctx, kind: 'heroes' | 'items' | 'enemies', id: string): void {
  if (c.preview || c.run.mode === 'tutorial') return;
  if ((c.game.profile.seen[kind] as string[]).includes(id)) return;
  (profile(c).seen[kind] as string[]).push(id);
}
