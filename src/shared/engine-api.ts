/**
 * The engine's public surface. src/engine/index.ts must export `createEngine(content): Engine`.
 * UI, simulation bots and tests talk to the engine only through this interface.
 */
import type { ContentDB, FaceEffect, KeywordId, SymbolId } from './content';
import type { HeroId } from './roster';
import type { Action, ActiveSet, GameState, Profile, SaveFile, StepResult, TargetRef } from './state';

export class IllegalActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalActionError';
  }
}

export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveError';
  }
}

/** A die as the player should see it right now, with every modifier applied. */
export interface DieView {
  die: number;
  hero: number;
  faceIndex: number;
  /** Effective effect (a blank may act as something else through items; a cursed face is blank). */
  effect: FaceEffect;
  symbol: SymbolId | null;
  /** Effective value including set bonus, items and keywords, as it would resolve now. */
  value: number;
  keywords: KeywordId[];
  cursed: boolean;
  locked: boolean;
  jammed: boolean;
  used: boolean;
  /** Does using it need a target tap? */
  needsTarget: boolean;
  /** Everything it may be aimed at (empty when needsTarget is false). */
  targets: TargetRef[];
  /** Can it be used right now? */
  usable: boolean;
  /** For Echo: the die index being copied, else null. */
  echoOf: number | null;
}

/** Exact outcome of using a die on a target, without changing anything. */
export interface DiePreview {
  /** One entry per unit affected. */
  hits: {
    target: TargetRef;
    /** HP the unit will lose (after shield). */
    hpLoss: number;
    shieldLoss: number;
    shieldGain: number;
    heal: number;
    poison: number;
    weaken: number;
    kills: boolean;
  }[];
  /** HP the user will lose (Reckless, thorns). */
  selfHpLoss: number;
  rerollsNextTurn: number;
}

/** Exact outcome of pressing End Turn now. */
export interface EnemyForecast {
  /** Index-aligned with RunState.heroes. */
  heroes: {
    hpLoss: number;
    shieldLoss: number;
    /** Hero would be downed. */
    downed: boolean;
    jammed: boolean;
    cursedFace: number | null;
  }[];
  rerollsStolen: number;
  /** All living heroes would be downed: the run would end. */
  partyWipe: boolean;
}

export interface Engine {
  readonly content: ContentDB;

  newProfile(): Profile;
  newGame(): GameState;

  /** Applies an action. Never mutates its input. Throws IllegalActionError if the action is not legal. */
  apply(game: GameState, action: Action): StepResult;
  canApply(game: GameState, action: Action): boolean;
  /** Every legal action in the current state (used by bots and fuzz tests). */
  legalActions(game: GameState): Action[];

  /** Views of all hero dice in the current fight (empty when not in a fight). */
  dice(game: GameState): DieView[];
  previewDie(game: GameState, die: number, target?: TargetRef): DiePreview;
  forecast(game: GameState): EnemyForecast;
  /** The set(s) the showing dice would form if rolling ended now (for the banner while rolling). */
  previewSets(game: GameState): ActiveSet[];
  /** A plain-English reason the action is not legal right now, or null if it is legal. */
  whyIllegal(game: GameState, action: Action): string | null;

  /** The seed and fixed party for a calendar day. Same input, same output, forever. */
  dailySeed(dateKey: string): string;
  dailyHeroes(dateKey: string): [HeroId, HeroId, HeroId];

  /** Save format. `load` runs migrations and validates; throws SaveError on anything unusable. */
  save(file: SaveFile): string;
  load(text: string): SaveFile;
  newSave(): SaveFile;
}

export type CreateEngine = (content: ContentDB) => Engine;
