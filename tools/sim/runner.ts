/** Plays one whole run with a bot through the public Engine interface and records what happened. */
import type { Action, ContentDB, Engine, GameState, HeroId, ItemId, Profile, RunState } from '@shared';
import type { Rng } from './rng';

export interface BotEnv {
  engine: Engine;
  content: ContentDB;
  rng: Rng;
}

export interface Bot {
  name: string;
  /** The next action for the current state (a run is in progress and not finished). */
  decide(env: BotEnv, game: GameState): Action;
}

export interface RunResult {
  won: boolean;
  /** Act and slot the run ended in (3 / 4 for a win). */
  act: number;
  slot: number;
  fightsWon: number;
  bossesWon: number;
  turns: number;
  heroes: HeroId[];
  feats: string[];
  itemsTaken: ItemId[];
  itemsOffered: ItemId[];
  /** Items held when the run ended. */
  itemsHeld: ItemId[];
  steps: number;
  /** The bot gave the run up because a fight would not end. */
  stalled: boolean;
}

/** A profile with every hero and every locked item available, and no feats done (so each run reports the feats it earns). */
export function fullProfile(engine: Engine): Profile {
  const p = engine.newProfile();
  p.unlockedHeroes = engine.content.heroes.map((h) => h.id);
  p.unlockedItems = engine.content.items.filter((i) => i.locked).map((i) => i.id);
  p.maxTier = engine.content.tiers.length;
  p.tutorialDone = true;
  return p;
}

const MAX_STEPS = 6000;

export function playRun(
  env: BotEnv, bot: Bot, profile: Profile, heroes: [HeroId, HeroId, HeroId], tier: number, seed: string,
  /** Experiments only (never the gate): lets a study change the starting state, e.g. hand the party one item. */
  setup?: (game: GameState) => GameState,
): { result: RunResult; profile: Profile } {
  const { engine } = env;
  let game: GameState = { profile, run: null };
  game = engine.apply(game, { type: 'startRun', heroes, tier, seed }).game;
  if (setup) game = setup(game);
  const itemsTaken: ItemId[] = [];
  const itemsOffered: ItemId[] = [];
  let lastReward: unknown = null;
  let lastShop: unknown = null;
  let steps = 0;
  let abandoned: RunState | null = null;
  while (game.run && game.run.phase !== 'victory' && game.run.phase !== 'defeat') {
    const run = game.run;
    if (run.reward && run.reward !== lastReward && run.phase === 'reward') {
      lastReward = run.reward;
      for (const o of run.reward.options) if (o.type === 'item') itemsOffered.push(o.item);
    }
    if (run.shop && lastShop === null) {
      lastShop = run.shop;
      for (const s of run.shop.slots) if (s.type === 'item') itemsOffered.push(s.item);
    }
    if (!run.shop) lastShop = null;
    if (++steps > MAX_STEPS) throw new Error(`bot ${bot.name} did not finish run ${seed} in ${MAX_STEPS} steps (phase ${run.phase})`);
    const action = bot.decide(env, game);
    if (action.type === 'pickReward' && run.reward) {
      const o = run.reward.options[action.option];
      if (o && o.type === 'item') itemsTaken.push(o.item);
    } else if (action.type === 'shopBuy' && run.shop) {
      const s = run.shop.slots[action.slot];
      if (s && s.type === 'item') itemsTaken.push(s.item);
    }
    if (action.type === 'abandonRun') {
      abandoned = run;
      game = engine.apply(game, action).game;
      break;
    }
    game = engine.apply(game, action).game;
  }
  const run = abandoned ?? game.run!;
  const result: RunResult = {
    won: !abandoned && run.phase === 'victory',
    stalled: !!abandoned,
    act: run.act,
    slot: run.slot,
    fightsWon: run.fightsWon,
    bossesWon: run.stats.run.bossesWon ?? 0,
    turns: run.stats.run.turnsTaken ?? 0,
    heroes: run.heroes.map((h) => h.heroId),
    feats: run.featsEarned.slice(),
    itemsTaken,
    itemsOffered,
    itemsHeld: run.heroes.flatMap((h) => h.items),
    steps,
  };
  if (!abandoned) game = engine.apply(game, { type: 'continue' }).game;
  return { result, profile: game.profile };
}
