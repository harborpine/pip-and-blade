/** What a worker can be asked to do, and the code that does it (also callable in-process). */
import { CONTENT } from '@content';
import { createEngine } from '@engine';
import type { Engine, GameState, HeroId, ItemId, Profile } from '@shared';
import { STARTER_HEROES } from '@shared';
import { carelessBot } from './careless';
import { makeDraftCtx, planItem } from './draft';
import { makeRng } from './rng';
import type { Bot, RunResult } from './runner';
import { fullProfile, playRun } from './runner';
import { skilledBot } from './skilled';
import { STRATEGIES } from './strategies';

export interface RunsJob {
  kind: 'runs';
  /** Label the results are grouped under. */
  group: string;
  bot: 'careless' | 'skilled';
  /** Strategy name the skilled bot commits to (party included), or null for general play. */
  strategy: string | null;
  /** 'mixed' = a seeded random party from all 8 heroes; 'starters' = the three starters on a fresh profile. */
  party: 'mixed' | 'starters' | 'strategy';
  /** With party 'strategy': whose party to field (defaults to `strategy`). Lets the same party be played uncommitted. */
  partyOf?: string;
  /** A fixed trio (put in the bot's usual order: toughest in front, Automaton last). Overrides `party`. */
  heroes?: HeroId[];
  tier: number;
  /** Extra self-imposed rules used by the scripted feat checks. */
  quirk?: 'noRerollBoss';
  /** Item study only (never part of the gate): the party starts the run already holding this item. */
  startItem?: ItemId;
  seedPrefix: string;
  from: number;
  to: number;
}

/** A career: one fresh profile playing run after run, so lifetime feats and unlock pacing can be measured. */
export interface CareerJob {
  kind: 'career';
  group: string;
  bot: 'careless' | 'skilled';
  runs: number;
  seedPrefix: string;
  index: number;
}

export type Job = RunsJob | CareerJob;

export interface CareerResult {
  /** Run number (1-based) at which each feat was first earned. */
  featAt: Record<string, number>;
  wins: number;
  runs: number;
}

export interface JobResult {
  group: string;
  runs: RunResult[];
  career?: CareerResult;
}

let engine: Engine | null = null;
function getEngine(): Engine {
  engine ??= createEngine(CONTENT);
  return engine;
}

function botFor(job: { bot: 'careless' | 'skilled'; strategy?: string | null; quirk?: RunsJob['quirk'] }): Bot {
  if (job.bot === 'careless') return carelessBot;
  return skilledBot({ strategy: job.strategy ? STRATEGIES[job.strategy] ?? null : null, quirk: job.quirk });
}

/** Seeded party of three different heroes from those unlocked. Front-liners first. */
export function mixedParty(eng: Engine, profile: Profile, seed: string): [HeroId, HeroId, HeroId] {
  const rng = makeRng(`party|${seed}`);
  const pool = profile.unlockedHeroes.slice();
  const picked: HeroId[] = [];
  while (picked.length < 3 && pool.length) picked.push(pool.splice(rng.int(pool.length), 1)[0]!);
  return orderParty(eng, picked);
}

/** Toughest hero in front; the Automaton goes last so its Echo copies the die on its left. */
export function orderParty(eng: Engine, ids: HeroId[]): [HeroId, HeroId, HeroId] {
  const hp = (id: HeroId): number => eng.content.heroes.find((h) => h.id === id)?.maxHp ?? 0;
  const sorted = ids.slice().sort((a, b) => hp(b) - hp(a));
  const i = sorted.indexOf('automaton');
  if (i >= 0 && i < sorted.length - 1) {
    sorted.splice(i, 1);
    sorted.push('automaton');
  }
  return sorted as [HeroId, HeroId, HeroId];
}

/** Hands the party one item before the first fight's first action, on the hero the skilled bot would give it to. */
function withStartItem(eng: Engine, game: GameState, id: ItemId): GameState {
  const run = game.run!;
  const def = eng.content.items.find((i) => i.id === id);
  if (!def) return game;
  const hero = planItem(makeDraftCtx(eng.content, null), run, id)?.hero ?? 0;
  let hp = 0;
  for (const m of def.modifiers ?? []) if (m.type === 'maxHp') hp += m.amount;
  const heroes = run.heroes.map((h, i) => (i === hero ? { ...h, items: [...h.items, id], maxHp: h.maxHp + hp, hp: h.hp + hp } : h));
  return { ...game, run: { ...run, heroes } };
}

export function runJob(job: Job): JobResult {
  const eng = getEngine();
  const env = (seed: string): { engine: Engine; content: Engine['content']; rng: ReturnType<typeof makeRng> } => ({ engine: eng, content: eng.content, rng: makeRng(`bot|${seed}`) });
  if (job.kind === 'career') {
    let profile = eng.newProfile();
    const bot = botFor(job);
    const featAt: Record<string, number> = {};
    const runs: RunResult[] = [];
    let wins = 0;
    for (let i = 0; i < job.runs; i++) {
      const seed = `${job.seedPrefix}-${job.index}-${i}`;
      const party = mixedParty(eng, profile, seed);
      const out = playRun(env(seed), bot, profile, party, 0, seed);
      profile = out.profile;
      if (out.result.won) wins++;
      for (const f of out.result.feats) featAt[f] ??= i + 1;
      runs.push(out.result);
    }
    return { group: job.group, runs, career: { featAt, wins, runs: job.runs } };
  }
  const bot = botFor(job);
  const out: RunResult[] = [];
  for (let i = job.from; i < job.to; i++) {
    const seed = `${job.seedPrefix}-${i}`;
    let profile: Profile;
    let party: [HeroId, HeroId, HeroId];
    if (job.party === 'starters') {
      profile = eng.newProfile();
      party = orderParty(eng, STARTER_HEROES.slice());
    } else {
      profile = fullProfile(eng);
      const partyOf = job.partyOf ?? job.strategy;
      if (job.heroes) party = orderParty(eng, job.heroes);
      else if (job.party === 'strategy' && partyOf && STRATEGIES[partyOf]) party = STRATEGIES[partyOf]!.party;
      else party = mixedParty(eng, profile, seed);
    }
    out.push(playRun(env(seed), bot, profile, party, job.tier, seed, job.startItem ? (game) => withStartItem(eng, game, job.startItem!) : undefined).result);
  }
  return { group: job.group, runs: out };
}
