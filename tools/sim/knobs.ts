/**
 * The skilled bot's judgement weights, in one place.
 * The defaults are the ones that won most often in self-play. For experiments they can be
 * overridden with the SIM_K environment variable (JSON), e.g. SIM_K={"enemy":1.1}.
 * These change how well the bot plays, never the rules or the thresholds.
 */
const defaults = {
  /** Value of 1 hero HP left after the enemy turn. */
  hp: 1,
  /** Cost of a hero being downed (plus 0.4 x max HP). */
  down: 12,
  /** Value of removing 1 enemy HP. */
  enemy: 0.95,
  /** Value of removing an enemy from the fight. */
  alive: 2.5,
  /** Extra cost of leaving a hero at 3 HP or less. */
  low: 1.5,
  /** Rolling model: value of 1 point of damage prevented (kills, Weaken, shield). */
  block: 1.35,
  /** Rolling model: value of 1 HP healed. */
  heal: 0.9,
  /** Doors: party HP share above which an elite fight is worth taking. */
  eliteHp: 0.8,
  /** Doors: base appeal of the elite door when healthy. */
  elite: 0.7,
  /** Draft: value of 1 HP when choosing between healing and upgrades. */
  hpValue: 0.085,
};

export type Knobs = typeof defaults;

function load(): Knobs {
  const raw = process.env.SIM_K;
  if (!raw) return defaults;
  return { ...defaults, ...(JSON.parse(raw) as Partial<Knobs>) };
}

export const K: Knobs = load();
