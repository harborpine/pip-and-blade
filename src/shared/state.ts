/**
 * Runtime state, player actions and engine events.
 * Everything here is plain JSON (no classes, Maps, Sets, undefined-vs-missing tricks) so it
 * can be saved with JSON.stringify and restored exactly.
 */
import type { DoorKind, FaceEffect, KeywordId, Rarity, SetKind, StatKey, StatusId, SymbolId, TrickKind } from './content';
import type { EnemyId, HeroId, ItemId } from './roster';

export const SAVE_VERSION = 1;

// ---------------------------------------------------------------- units

/** A face on a hero's die during a run (a mutable copy of a FaceDef). */
export interface FaceState {
  defId: string;
  name: string;
  effect: FaceEffect;
  symbol: SymbolId | null;
  /** Base value including upgrades (not including fight-only growth). */
  value: number;
  keywords: KeywordId[];
  upgrades: number;
}

export type Statuses = Partial<Record<StatusId, number>>;

export interface HeroState {
  heroId: HeroId;
  hp: number;
  maxHp: number;
  /** Exactly 6. */
  faces: FaceState[];
  items: ItemId[];
  /** True while out of the current fight. Cleared (with partial HP) when the next fight starts. */
  downed: boolean;
}

/** Fight-only data for a hero, index-aligned with RunState.heroes. */
export interface HeroFightState {
  shield: number;
  /** Shield that does not expire (Ward). Consumed after normal shield. */
  ward: number;
  statuses: Statuses;
  /** Fight-only growth per face index. */
  growth: number[];
  /** Face indexes cursed to blank for this fight. */
  cursed: number[];
}

export interface DieState {
  /** Index into RunState.heroes. A downed hero's die is absent from FightState.dice. */
  hero: number;
  /** Which face is showing (0..5). */
  face: number;
  /** Locked by the player (kept on reroll). */
  locked: boolean;
  /** Jammed by an enemy: cannot be rerolled this turn. */
  jammed: boolean;
  used: boolean;
  /** Rerolled at least once this turn. */
  rerolled: boolean;
  /** True if this was the first die the player locked this turn. */
  firstLocked: boolean;
  /** Turn-only modifiers from sets, items and keywords like Rally. */
  bonus: number;
  multiplier: number;
  repeats: number;
}

export interface ResolvedEnemyAction {
  type: 'attack' | 'shield' | 'heal' | 'status' | 'lockDie' | 'curseFace' | 'stealReroll' | 'summon' | 'charge';
  /** Final per-hit amount as it will be applied (after strength; before weak applied later and the target's shield). */
  amount: number;
  hits: number;
  pierce: boolean;
  poison: number;
  status: StatusId | null;
  /** Hero indexes this lands on (empty for enemy-side actions). */
  heroes: number[];
  /** Enemy uids this lands on (empty for hero-side actions). */
  enemies: number[];
  /** For curseFace: the exact face index that will be cursed, per hero in `heroes`. */
  faces: number[];
  summon: EnemyId | null;
}

export interface Intent {
  moveId: string;
  moveName: string;
  actions: ResolvedEnemyAction[];
}

export interface EnemyState {
  /** Unique within the fight; stable across turns. */
  uid: number;
  enemyId: EnemyId;
  hp: number;
  maxHp: number;
  shield: number;
  statuses: Statuses;
  /** What it will do in the coming enemy phase. Never null while alive during the player's turn. */
  intent: Intent | null;
  /** Position in a cycle AI. */
  cursor: number;
  lastMoveId: string | null;
  summoned: boolean;
}

export interface ActiveSet {
  kind: SetKind;
  symbol: SymbolId | null;
  /** Indexes into FightState.dice. */
  dice: number[];
}

export type TargetRef = { side: 'enemy'; uid: number } | { side: 'hero'; index: number };

export type FightPhase = 'rolling' | 'acting';

export interface FightState {
  encounterId: string;
  kind: 'normal' | 'elite' | 'boss';
  turn: number;
  phase: FightPhase;
  rerollsLeft: number;
  rerollsSpent: number;
  /** Rerolls added to / removed from next turn's allowance (Focus faces, stolen rerolls). */
  nextTurnRerolls: number;
  /** Hero indexes whose die will be jammed next turn. */
  nextTurnJams: number[];
  dice: DieState[];
  heroes: HeroFightState[];
  enemies: EnemyState[];
  /** Filled when the rolling phase ends. */
  sets: ActiveSet[];
  nextEnemyUid: number;
  /** Number of dice used this turn. */
  diceUsed: number;
  /** How many times each limited trigger has fired: key "<source>#<index>" . */
  limits: Record<string, number>;
  /** Snapshots for undo, newest last. Each is a JSON string of the undoable part of the run. Cleared on End Turn. */
  undo: string[];
}

// ---------------------------------------------------------------- between fights

export type RewardOption =
  | { type: 'face'; hero: number; face: FaceState; rarity: Rarity }
  | { type: 'upgrade'; hero: number; amount: number }
  | { type: 'item'; item: ItemId; rarity: Rarity };

export interface RewardState {
  options: RewardOption[];
  /** How many more reward screens follow this one (elite fights give extra picks). */
  picksLeft: number;
  source: 'fight' | 'treasure' | 'event';
}

export interface DoorOption {
  kind: DoorKind;
}

export type ShopSlot =
  | { type: 'item'; item: ItemId; price: number; sold: boolean }
  | { type: 'face'; hero: number; face: FaceState; price: number; sold: boolean }
  | { type: 'upgrade'; price: number; sold: boolean }
  | { type: 'heal'; price: number; sold: boolean };

export interface ShopState {
  slots: ShopSlot[];
}

export interface EventState {
  eventId: string;
  /** Set once a choice has been made; UI shows the result text until 'continue'. */
  chosen: number | null;
}

export interface RestState {
  used: boolean;
}

export type RunPhase =
  | 'fight'
  | 'reward'
  | 'doors'
  | 'rest'
  | 'shop'
  | 'event'
  | 'victory' // run won; waiting for 'continue'
  | 'defeat'; // run lost; waiting for 'continue'

export type RunMode = 'standard' | 'daily' | 'tutorial';

export type StatCounters = Partial<Record<StatKey, number>>;

export interface RunState {
  seed: string;
  mode: RunMode;
  /** YYYY-MM-DD for daily runs, else null. */
  dateKey: string | null;
  tier: number;
  heroes: HeroState[];
  gold: number;
  act: 1 | 2 | 3;
  /** Which combat of the act we are at or heading to: 1,2,3 = fights, 4 = boss. */
  slot: 1 | 2 | 3 | 4;
  /** Total fights won so far this run. */
  fightsWon: number;
  phase: RunPhase;
  /** The next fight is the elite version (chosen via a door). */
  eliteNext: boolean;
  fight: FightState | null;
  reward: RewardState | null;
  doors: DoorOption[] | null;
  shop: ShopState | null;
  event: EventState | null;
  rest: RestState | null;
  stats: { turn: StatCounters; fight: StatCounters; run: StatCounters };
  /** Per-run trigger limits ("once per run" items). */
  limits: Record<string, number>;
  /** Counters for the seeded random streams, keyed by stream name. */
  rng: Record<string, number>;
  /** Feats completed during this run (already applied to the profile). */
  featsEarned: string[];
  /** Daily score so far (0 for other modes). */
  score: number;
}

// ---------------------------------------------------------------- profile (meta progress)

export interface DailyRecord {
  attempts: number;
  bestScore: number;
  won: boolean;
}

export interface Profile {
  unlockedHeroes: HeroId[];
  /** Item ids from the locked pool that are now available. */
  unlockedItems: ItemId[];
  featsDone: string[];
  /** Highest tier the player may select (0 until the first win, then up to 5). */
  maxTier: number;
  tutorialDone: boolean;
  seen: { heroes: HeroId[]; items: ItemId[]; enemies: EnemyId[] };
  stats: {
    runsPlayed: number;
    runsWon: number;
    winStreak: number;
    bestStreak: number;
    /** Highest tier won; -1 if never won. */
    tierWon: number;
    dailyWins: number;
    perHero: Partial<Record<HeroId, { runs: number; wins: number }>>;
    lifetime: StatCounters;
  };
  /** Keyed by YYYY-MM-DD. */
  daily: Record<string, DailyRecord>;
}

export interface GameState {
  profile: Profile;
  run: RunState | null;
}

export interface Settings {
  reduceMotion: boolean;
}

/** What is written to storage and to export files. */
export interface SaveFile {
  app: 'pip-and-blade';
  version: number;
  game: GameState;
  settings: Settings;
}

// ---------------------------------------------------------------- actions

export type Action =
  // meta
  | { type: 'startRun'; heroes: [HeroId, HeroId, HeroId]; tier: number; seed?: string }
  | { type: 'startDaily'; dateKey: string }
  | { type: 'startTutorial' }
  | { type: 'abandonRun' }
  /** Leave the victory/defeat screen; clears the run. */
  | { type: 'continue' }
  // fight, rolling phase
  | { type: 'toggleLock'; die: number }
  | { type: 'reroll' }
  // fight, acting (using the first die ends the rolling phase)
  | { type: 'useDie'; die: number; target?: TargetRef }
  | { type: 'undo' }
  | { type: 'endTurn' }
  // rewards
  | { type: 'pickReward'; option: number; hero?: number; face?: number; replaceItem?: number }
  | { type: 'skipReward' }
  // map
  | { type: 'pickDoor'; door: number }
  | { type: 'restHeal' }
  | { type: 'restUpgrade'; hero: number; face: number }
  | { type: 'shopBuy'; slot: number; hero?: number; face?: number; replaceItem?: number }
  | { type: 'leave' } // leave shop / rest / finished event
  | { type: 'eventChoice'; choice: number };

// ---------------------------------------------------------------- events (for animation and logs)

export type GameEvent =
  | { type: 'fightStart'; encounterId: string }
  | { type: 'turnStart'; turn: number }
  | { type: 'diceRolled'; dice: { die: number; face: number }[]; reroll: boolean }
  | { type: 'lockToggled'; die: number; locked: boolean }
  | { type: 'setsFormed'; sets: ActiveSet[] }
  | { type: 'dieUsed'; die: number; hero: number; target: TargetRef | null }
  | { type: 'damage'; target: TargetRef; amount: number; blocked: number; source: TargetRef | null; cause: 'die' | 'attack' | 'poison' | 'thorns' | 'reckless' | 'item' | 'set' | 'passive' }
  | { type: 'shield'; target: TargetRef; amount: number }
  | { type: 'heal'; target: TargetRef; amount: number }
  | { type: 'status'; target: TargetRef; status: StatusId; amount: number }
  | { type: 'rerollsChanged'; amount: number; when: 'now' | 'nextTurn' }
  | { type: 'unitDown'; target: TargetRef }
  | { type: 'heroRevived'; hero: number }
  | { type: 'enemyActs'; uid: number; moveId: string }
  | { type: 'trick'; kind: TrickKind; hero: number; face: number | null; blockedBy: ItemId | null }
  | { type: 'summoned'; uid: number; enemyId: EnemyId }
  | { type: 'intentsSet' }
  | { type: 'itemTriggered'; item: ItemId; hero: number }
  | { type: 'passiveTriggered'; uid: number }
  | { type: 'undone' }
  | { type: 'fightWon'; gold: number }
  | { type: 'gold'; amount: number }
  | { type: 'rewardTaken'; option: RewardOption | null }
  | { type: 'phase'; phase: RunPhase }
  | { type: 'featDone'; feat: string }
  | { type: 'unlocked'; kind: 'hero' | 'item' | 'tier'; id: string }
  | { type: 'runEnded'; won: boolean; score: number };

export interface StepResult {
  game: GameState;
  events: GameEvent[];
}
