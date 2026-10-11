/**
 * Pip & Blade rules engine. Pure and deterministic: no DOM, no clock, no unseeded randomness.
 * `createEngine(content)` is the only entry point; see src/shared/engine-api.ts for the contract.
 */
import type { Action, ContentDB, Engine, GameState, HeroId, StepResult } from '@shared';
import { IllegalActionError } from '@shared';
import { check, exec, legalActions } from './actions';
import { makeCtx } from './ctx';
import { buildDb } from './db';
import { dailyHeroes, dailySeed, newProfile } from './meta';
import { load, newSave, save } from './save/index';
import { dice, forecast, previewDie, previewSets } from './views';

/** Kept for callers written before previewSets / whyIllegal joined the contract. */
export type EngineX = Engine;

export function createEngine(content: ContentDB): Engine {
  const db = buildDb(content);
  return {
    content,
    newProfile: () => newProfile(db),
    newGame: () => ({ profile: newProfile(db), run: null }),
    apply(game: GameState, action: Action): StepResult {
      const err = check(makeCtx(db, game, false), action);
      if (err) throw new IllegalActionError(`${action.type}: ${err}`);
      const c = makeCtx(db, game, true);
      exec(c, action);
      return { game: c.game, events: c.ev };
    },
    canApply: (game, action) => check(makeCtx(db, game, false), action) === null,
    whyIllegal: (game, action) => check(makeCtx(db, game, false), action),
    legalActions: (game) => legalActions(makeCtx(db, game, false)),
    dice: (game) => dice(db, game),
    previewDie: (game, die, target) => previewDie(db, game, die, target),
    forecast: (game) => forecast(db, game),
    previewSets: (game) => previewSets(db, game),
    dailySeed,
    dailyHeroes: (dateKey) => dailyHeroes(db, dateKey) as [HeroId, HeroId, HeroId],
    save,
    load: (text) => load(db, text),
    newSave: () => newSave(db),
  };
}
