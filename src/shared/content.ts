/**
 * Content schema: the shape of every data file in src/content/.
 * The engine implements the behaviour of each union member here; content only picks and
 * parameterises them. Need a new member? Ask the lead (src/shared/ is lead-owned).
 * Exact semantics for every member are specified in docs/design.md.
 */
import type { EnemyId, HeroId, ItemId } from './roster';

// ---------------------------------------------------------------- dice faces

/** Symbols drive sets (pair / triple / rainbow). Blank faces have no symbol. */
export type SymbolId = 'blade' | 'guard' | 'heart' | 'spark' | 'skull';
export const SYMBOLS: readonly SymbolId[] = ['blade', 'guard', 'heart', 'spark', 'skull'];

/**
 * What a face does when used.
 *  damage: deal value to an enemy.          shield: give value shield to a hero.
 *  heal:   restore value HP to a hero.      weaken: reduce an enemy's next attack(s) this turn by value.
 *  focus:  gain value extra rerolls next turn (no target).
 *  blank:  does nothing (unless an item says otherwise).
 */
export type FaceEffect = 'damage' | 'shield' | 'heal' | 'weaken' | 'focus' | 'blank';
export const FACE_EFFECTS: readonly FaceEffect[] = ['damage', 'shield', 'heal', 'weaken', 'focus', 'blank'];

export type KeywordId =
  | 'cleave' // affects every unit on the targeted side
  | 'echo' // copies the neighbouring die's face, adding its own value as a bonus
  | 'growth' // +N value after each use, for the rest of the fight
  | 'reckless' // user loses N HP (cannot drop below 1)
  | 'pierce' // ignores shield
  | 'venom' // applies Poison equal to value instead of direct damage
  | 'ward' // shield from this face does not expire
  | 'twin' // resolves twice
  | 'rally' // every other unused hero die gets +N value this turn
  | 'momentum' // +N value per reroll spent this turn
  | 'poised' // +N value if no rerolls have been spent this turn
  | 'execute'; // damage x N against targets at or below half HP
export const KEYWORDS: readonly KeywordId[] = [
  'cleave', 'echo', 'growth', 'reckless', 'pierce', 'venom', 'ward', 'twin', 'rally', 'momentum', 'poised', 'execute',
];

export interface KeywordDef {
  id: KeywordId;
  name: string;
  /** Player-facing rules text. Use {n} for the parameter. */
  text: string;
  /** The keyword's number (growth step, reckless self-damage, rally bonus, momentum step, poised bonus, execute multiplier). 0 if unused. */
  param: number;
}

export interface FaceDef {
  /** Unique across all content, e.g. "duelist.lunge" or "pool.heavy_blow". */
  id: string;
  name: string;
  effect: FaceEffect;
  /** null only for blank faces. */
  symbol: SymbolId | null;
  value: number;
  keywords: KeywordId[];
}

export type Rarity = 'common' | 'uncommon' | 'rare';

/** A face that can be offered as a "replace a face" reward. */
export interface RewardFaceDef extends FaceDef {
  rarity: Rarity;
  /** Which heroes can be offered this face. 'any' = everyone. */
  heroes: HeroId[] | 'any';
}

// ---------------------------------------------------------------- heroes

export interface HeroDef {
  id: HeroId;
  name: string;
  title: string;
  blurb: string;
  maxHp: number;
  /** Exactly 6 starting faces. */
  faces: FaceDef[];
  itemSlots: number;
  /** True for the 3 heroes available on a fresh profile. Others unlock through feats. */
  starter: boolean;
}

// ---------------------------------------------------------------- statuses

/**
 * Stack-count statuses that can sit on heroes or enemies.
 *  poison:   at the start of the enemy phase the unit loses HP equal to stacks (ignores shield), then stacks -1.
 *  weak:     the unit's attacks this turn deal `stacks` less (min 0). Cleared after the unit acts.
 *  strength: the unit's attacks deal +stacks. Permanent for the fight.
 *  thorns:   when hit by a direct attack/damage face, the attacker takes `stacks` damage. Permanent unless noted.
 *  regen:    at the start of the unit's side's turn, heal stacks, then stacks -1.
 *  mark:     the unit takes +stacks damage from each direct hit. Cleared at end of the round.
 */
export type StatusId = 'poison' | 'weak' | 'strength' | 'thorns' | 'regen' | 'mark';
export const STATUSES: readonly StatusId[] = ['poison', 'weak', 'strength', 'thorns', 'regen', 'mark'];

export interface StatusDef {
  id: StatusId;
  name: string;
  text: string;
}

// ---------------------------------------------------------------- triggers / effects (items, passives, tiers)

export type Trigger =
  | 'fightStart'
  | 'turnStart' // after dice are rolled for the new turn
  | 'rollEnd' // rolling phase just ended; sets are known
  | 'dieLocked' // player locked a die (first time this turn for that die)
  | 'dieRerolled' // fired once per die actually rerolled
  | 'dieUsed' // after a hero die resolves
  | 'setFormed' // once per active set at rollEnd
  | 'heroDamaged' // a hero lost HP (after shield)
  | 'heroDowned'
  | 'enemyDamaged'
  | 'enemyKilled'
  | 'turnEnd' // player pressed End Turn, before enemies act
  | 'enemyPhaseEnd'
  | 'fightEnd'; // fight won

export type SetKind = 'pair' | 'triple' | 'rainbow';

export interface FaceFilter {
  effect?: FaceEffect[];
  symbol?: SymbolId[];
  keyword?: KeywordId[];
}

export type Condition =
  /** The die involved in the trigger belongs to the item's owner. */
  | { type: 'ownerDie' }
  /** The face involved in the trigger matches. */
  | { type: 'face'; filter: FaceFilter }
  | { type: 'set'; kind?: SetKind; symbol?: SymbolId }
  /** Owner (item) / self (enemy passive) HP is at or below pct% of max. */
  | { type: 'hpAtMostPct'; pct: number }
  | { type: 'turn'; op: CompareOp; value: number }
  | { type: 'rerollsSpent'; op: CompareOp; value: number }
  /** Number of hero dice used so far this turn (counted after the triggering die). */
  | { type: 'diceUsed'; op: CompareOp; value: number }
  /** Number of usable hero dice not yet used this turn (counted after the triggering die). */
  | { type: 'unusedDice'; op: CompareOp; value: number }
  /** Every living hero's die has been used this turn. */
  | { type: 'allDiceUsed' }
  /** The hero involved in the trigger (damaged/downed) is the item's owner. */
  | { type: 'ownerInvolved' }
  /** The unit that died/was damaged had this status. */
  | { type: 'targetHasStatus'; status: StatusId }
  | { type: 'all'; of: Condition[] }
  | { type: 'any'; of: Condition[] }
  | { type: 'not'; of: Condition };

export type CompareOp = '>=' | '<=' | '==';

/** Who an effect lands on. "owner"/"self" = the item's hero or the passive's enemy. */
export type Selector =
  | 'owner'
  | 'self'
  | 'allHeroes'
  | 'lowestHpHero'
  | 'frontHero'
  | 'randomHero'
  | 'allEnemies'
  | 'frontEnemy'
  | 'lowestHpEnemy'
  | 'randomEnemy'
  | 'otherEnemies' // all enemies except the trigger's subject
  | 'triggerTarget' // the unit the triggering die/attack was aimed at
  | 'triggerSource'; // the unit that caused the trigger (attacker, die user)

/** A fixed number, or one scaled from the situation. */
export type Amount =
  | number
  | {
      scale:
        | 'triggerValue' // value of the die / damage amount involved
        | 'rerollsLeft'
        | 'rerollsSpent'
        | 'unusedDice' // living hero dice not used this turn
        | 'setSize'
        | 'targetStatus' // stacks of `status` on the trigger's subject
        | 'blanksShowing'; // blank faces currently showing on hero dice
      factor: number;
      status?: StatusId;
      /** Added after scaling. */
      plus?: number;
    };

export type DieSelector = 'triggerDie' | 'ownerDie' | 'allDice' | 'otherDice' | 'setDice';

export type Effect =
  | { type: 'damage'; target: Selector; amount: Amount; pierce?: boolean }
  | { type: 'shield'; target: Selector; amount: Amount; ward?: boolean }
  | { type: 'heal'; target: Selector; amount: Amount }
  | { type: 'status'; target: Selector; status: StatusId; amount: Amount }
  | { type: 'rerolls'; amount: Amount; when: 'now' | 'nextTurn' }
  | { type: 'gold'; amount: Amount }
  /** Add to a die's value until end of turn. */
  | { type: 'dieBonus'; dice: DieSelector; amount: Amount }
  /** Multiply a die's final value until end of turn. */
  | { type: 'dieMultiply'; dice: DieSelector; factor: number }
  /** The die resolves an extra time when used this turn. */
  | { type: 'dieRepeat'; dice: DieSelector; times: number }
  /** Enemy-side: curse a face of a hero's die to blank for the rest of the fight. */
  | { type: 'curseFace'; target: Selector; face: CurseFaceRule }
  /** Enemy-side: summon enemies (up to the 4-enemy cap). */
  | { type: 'summon'; enemy: EnemyId; count: number }
  /** Revive the owner at pct% of max HP (use with trigger heroDowned + ownerInvolved). */
  | { type: 'revive'; pct: number };

export interface TriggeredEffect {
  trigger: Trigger;
  condition?: Condition;
  effects: Effect[];
  /** Maximum number of times this can fire per period. */
  limit?: { per: 'turn' | 'fight' | 'run'; count: number };
}

export type Scope = 'owner' | 'party';
export type TrickKind = 'lockDie' | 'curseFace' | 'stealReroll';

/** Always-on rule changes. */
export type Modifier =
  | { type: 'maxHp'; amount: number }
  /** Extra rerolls each turn (negative allowed). firstTurnOnly limits it to turn 1 of each fight. */
  | { type: 'rerolls'; amount: number; firstTurnOnly?: boolean }
  /** Flat value bonus for matching faces. */
  | { type: 'faceValue'; amount: number; filter?: FaceFilter; scope: Scope; hpAtMostPct?: number; noRerollsSpent?: boolean }
  /** Blank faces act as this effect with this value (they stay symbol-less). Multiple blankAs items all apply. */
  | { type: 'blankAs'; effect: Exclude<FaceEffect, 'blank'>; value: number; cleave?: boolean }
  /** Dice that were rerolled at least once this turn get +amount. */
  | { type: 'rerolledBonus'; amount: number; scope: Scope }
  /** The first die locked each turn has its final value multiplied. */
  | { type: 'firstLockMultiplier'; factor: number }
  /** Extra value for each die in a set of this kind (all kinds if omitted). */
  | { type: 'setBonus'; amount: number; kind?: SetKind }
  /** Triple bursts are multiplied. */
  | { type: 'tripleBurstMultiplier'; factor: number }
  /** Enables the rainbow set (three different symbols). */
  | { type: 'enableRainbow' }
  | { type: 'grantKeyword'; keyword: KeywordId; filter?: FaceFilter; scope: Scope }
  /** Owner's die counts as whichever symbol makes the best set. */
  | { type: 'wildSymbol' }
  /** Shield no longer expires at the start of the turn. */
  | { type: 'shieldPersists'; scope: Scope }
  /** All shield gained is +amount. */
  | { type: 'shieldGain'; amount: number; scope: Scope }
  | { type: 'trickImmune'; tricks: TrickKind[]; scope: Scope }
  /** Stacks of a status the party applies are +amount. */
  | { type: 'statusPotency'; status: StatusId; amount: number }
  /** Growth keyword step is +amount. */
  | { type: 'growthStep'; amount: number }
  /** Permanent status on the owner at fight start. */
  | { type: 'startStatus'; status: StatusId; amount: number }
  /** Downed heroes return at +pct points of max HP. */
  | { type: 'returnHpPct'; amount: number }
  /** Every hero heals this much after each won fight. */
  | { type: 'healAfterFight'; amount: number }
  | { type: 'goldGainPct'; amount: number }
  | { type: 'shopDiscountPct'; amount: number }
  /** Rerolling exactly one die costs no reroll, `count` times per turn. */
  | { type: 'freeSingleReroll'; count: number };

// ---------------------------------------------------------------- items

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Player-facing rules text, exact and complete. */
  text: string;
  rarity: Rarity;
  /** True if the item is only in the pool once its feat is done. */
  locked: boolean;
  modifiers?: Modifier[];
  triggers?: TriggeredEffect[];
}

// ---------------------------------------------------------------- enemies

/** Which hero(es) an enemy action lands on. Chosen when the intent is created, so it is always shown. */
export type HeroTargetRule = 'front' | 'back' | 'lowestHp' | 'highestHp' | 'random' | 'all';
export type EnemyTargetRule = 'self' | 'allAllies' | 'lowestHpAlly' | 'otherAllies';
export type CurseFaceRule = 'highest' | 'random' | 'showing';

export type EnemyAction =
  | { type: 'attack'; amount: number; target: HeroTargetRule; hits?: number; pierce?: boolean; poison?: number }
  | { type: 'shield'; amount: number; target: EnemyTargetRule }
  | { type: 'heal'; amount: number; target: EnemyTargetRule }
  | { type: 'status'; status: StatusId; amount: number; target: EnemyTargetRule | HeroTargetRule; side: 'enemy' | 'hero' }
  /** Next turn the target hero's die is jammed: it rolls once and cannot be rerolled. */
  | { type: 'lockDie'; target: HeroTargetRule }
  /** One face of the target hero's die becomes blank for the rest of the fight. */
  | { type: 'curseFace'; target: HeroTargetRule; face: CurseFaceRule }
  /** The party has `amount` fewer rerolls next turn. */
  | { type: 'stealReroll'; amount: number }
  | { type: 'summon'; enemy: EnemyId; count: number }
  /** Does nothing now; shown as "charging". */
  | { type: 'charge' };

export interface MoveDef {
  id: string;
  name: string;
  actions: EnemyAction[];
}

/** How an enemy picks its next move. Always resolved a full turn ahead and shown to the player. */
export type EnemyAi =
  | { type: 'cycle'; order: string[] }
  | { type: 'weighted'; weights: Record<string, number>; noRepeat?: boolean };

export interface EnemyPhase {
  /** This phase is active while HP is at or below this % of max. The lowest matching phase wins. */
  hpAtMostPct: number;
  ai: EnemyAi;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  blurb: string;
  kind: 'normal' | 'elite' | 'boss';
  act: 1 | 2 | 3;
  hp: number;
  moves: MoveDef[];
  ai: EnemyAi;
  phases?: EnemyPhase[];
  passives?: TriggeredEffect[];
  /** Player-facing description of the passive / boss mechanic. Required if passives or phases exist. */
  passiveText?: string;
  startShield?: number;
  startStatuses?: Partial<Record<StatusId, number>>;
  /** Bonus gold on kill. */
  gold?: number;
}

export interface EncounterDef {
  id: string;
  act: 1 | 2 | 3;
  kind: 'normal' | 'elite' | 'boss';
  /** For normal fights: which of the act's three fight slots this can appear in (1 = easiest). */
  slots?: (1 | 2 | 3)[];
  /** 1 to 4 enemies, left (front) to right. */
  enemies: EnemyId[];
}

// ---------------------------------------------------------------- sets

export interface SetDef {
  kind: SetKind;
  /** Omit for a rule that applies to every symbol (and for rainbow). A symbol-specific entry overrides the generic one. */
  symbol?: SymbolId;
  name: string;
  text: string;
  /** Added to the value of each die in the set this turn. */
  dieBonus: number;
  /** Fired once when the set forms (triple "bursts"). Selectors owner/self are invalid here. */
  burst?: Effect[];
}

// ---------------------------------------------------------------- run structure

export type DoorKind = 'elite' | 'rest' | 'shop' | 'event' | 'treasure' | 'onward';

export interface DoorDef {
  kind: DoorKind;
  name: string;
  text: string;
  /** Relative chance to be offered, per act [act1, act2, act3]. */
  weight: [number, number, number];
}

export type EventOutcome =
  | { type: 'gold'; amount: number }
  | { type: 'heal'; target: 'all' | 'lowest' | 'random'; amount: number }
  | { type: 'hurt'; target: 'all' | 'highest' | 'random'; amount: number } // never reduces a hero below 1 HP
  | { type: 'maxHp'; target: 'all' | 'random'; amount: number }
  | { type: 'item'; rarity?: Rarity; item?: ItemId } // goes to the reward screen flow so the player picks the holder
  | { type: 'upgradeFace'; target: 'choose' | 'random'; amount: number }
  | { type: 'blankFace'; target: 'random' | 'lowestValue' }
  | { type: 'rewardFace'; rarity?: Rarity } // offers a replace-a-face pick
  | { type: 'nothing' };

export interface EventChoiceDef {
  label: string;
  /** Shown before choosing: must state the exact outcomes (no hidden gambles beyond what it says). */
  text: string;
  /** Shown after choosing. */
  result: string;
  outcomes: EventOutcome[];
  /** Choice is disabled unless the party has at least this much gold (and pays it). */
  costGold?: number;
}

export interface EventDef {
  id: string;
  name: string;
  text: string;
  acts: (1 | 2 | 3)[];
  choices: EventChoiceDef[];
}

// ---------------------------------------------------------------- difficulty tiers

export type TierModifier =
  | { type: 'enemyHpPct'; amount: number }
  | { type: 'enemyAttack'; amount: number }
  | { type: 'enemyStartShield'; amount: number }
  | { type: 'enemyStartStatus'; status: StatusId; amount: number }
  | { type: 'rerolls'; amount: number; firstTurnOnly?: boolean }
  | { type: 'forceElite'; slot: 1 | 2 | 3 }
  | { type: 'healingPct'; amount: number }
  | { type: 'enemyPassive'; passive: TriggeredEffect; kinds: ('normal' | 'elite' | 'boss')[] };

export interface TierDef {
  /** 1..5. Tier N applies the modifiers of tiers 1..N. Tier 0 is base difficulty (no entry). */
  tier: number;
  name: string;
  /** Player-facing: the one enemy trick this tier adds. */
  text: string;
  modifiers: TierModifier[];
}

// ---------------------------------------------------------------- feats

/** Counters the engine tracks. Each exists at turn / fight / run / lifetime scope unless noted. */
export type StatKey =
  | 'rerollsSpent'
  | 'damageDealt'
  | 'biggestHit' // max single die resolution damage (max, not sum)
  | 'shieldGained'
  | 'healingDone'
  | 'poisonApplied'
  | 'blankDamage' // damage dealt by blank faces
  | 'pairsFormed'
  | 'triplesFormed'
  | 'rainbowsFormed'
  | 'enemiesKilled'
  | 'heroesDowned'
  | 'hpLost'
  | 'turnsTaken'
  | 'fightsWon'
  | 'elitesWon'
  | 'bossesWon'
  | 'facesReplaced'
  | 'facesUpgraded'
  | 'itemsTaken'
  | 'goldEarned'
  | 'goldSpent'
  | 'tricksSuffered'
  | 'recklessUses'
  | 'echoUses'
  | 'growthGained'
  | 'dicePlayed'
  // snapshot stats, evaluated at check time (scope ignored)
  | 'livingHeroes'
  | 'lowestLivingHeroHp'
  | 'itemsHeld'
  | 'blankFacesOwned'
  | 'runsWon' // lifetime
  | 'runsPlayed' // lifetime
  | 'winStreak' // lifetime, current
  | 'dailyWins' // lifetime
  | 'tierWon'; // highest tier won, lifetime (base win = 0; -1 if never won)

export interface StatTest {
  stat: StatKey;
  scope: 'turn' | 'fight' | 'run' | 'lifetime';
  op: CompareOp;
  value: number;
}

export interface FeatDef {
  id: string;
  name: string;
  /** Player-facing: exactly what to do. */
  text: string;
  /** When the tests are evaluated. */
  when: 'turnEnd' | 'fightWon' | 'bossWon' | 'runWon' | 'runEnded';
  tests: StatTest[];
  /** If set, the party must include all of these heroes. */
  heroes?: HeroId[];
  /** If set, the run's tier must be at least this. */
  minTier?: number;
  /** If set, only counts in this mode. Default: standard and daily both count; tutorial never counts. */
  mode?: 'standard' | 'daily';
  unlocks?: { heroes?: HeroId[]; items?: ItemId[] };
}

// ---------------------------------------------------------------- global rules / balance numbers

export interface Rules {
  partySize: number; // 3
  rerollsPerTurn: number; // 2
  maxEnemies: number; // 4
  /** A downed hero returns next fight with this % of max HP. */
  downedReturnHpPct: number;
  /** Max upgrades on one face, and value gained per upgrade. */
  maxUpgradesPerFace: number;
  upgradeAmount: number;
  /** Gold for winning [normal, elite, boss]. */
  goldPerFight: [number, number, number];
  /** Rarity weights for rewards per act: [common, uncommon, rare]. */
  rarityWeights: { normal: [number, number, number][]; elite: [number, number, number][]; boss: [number, number, number][] };
  /** Rest door: heal every hero by this % of max HP, or upgrade one face. */
  restHealPct: number;
  /** Shop prices by rarity and for services. */
  shop: { itemPrice: Record<Rarity, number>; facePrice: Record<Rarity, number>; upgradePrice: number; healPrice: number; healPct: number; itemsOffered: number; facesOffered: number };
  /** Treasure door: free item pick of this many options. */
  treasureChoices: number;
  /** Elite fights offer this many reward picks in a row. */
  eliteRewardPicks: number;
  /** Heal every hero by this % of max HP after each boss. */
  bossHealPct: number;
  /**
   * Anti-stall rule ("Fury"): from this fight turn onward, every living enemy gains this much
   * Strength at the start of each enemy phase (before it acts). Intents and the forecast
   * shown during that player turn already include the Strength that will be gained.
   */
  fury?: { fromTurn: number; strengthPerTurn: number };
  /** Daily score weights. */
  dailyScore: { perFightWon: number; perBossWon: number; winBonus: number; perHpLeft: number };
}

export interface TutorialDef {
  seed: string;
  heroes: [HeroId, HeroId, HeroId];
  encounter: EncounterDef;
}

/** Everything in src/content/, assembled. `CONTENT` in src/content/index.ts has this type. */
export interface ContentDB {
  rules: Rules;
  keywords: KeywordDef[];
  statuses: StatusDef[];
  heroes: HeroDef[];
  rewardFaces: RewardFaceDef[];
  items: ItemDef[];
  enemies: EnemyDef[];
  encounters: EncounterDef[];
  sets: SetDef[];
  doors: DoorDef[];
  events: EventDef[];
  tiers: TierDef[];
  feats: FeatDef[];
  tutorial: TutorialDef;
}
