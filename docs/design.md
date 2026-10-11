# Pip & Blade: design document

This is the specification every teammate builds against. Read BRIEF.md first (the owner's
requirements), then this file, then `src/shared/` (the types, which are the binding contract).
If this document and `src/shared/` disagree, `src/shared/` wins and you tell the lead.

## 1. Pitch

A portrait, one-thumb, offline dice-builder roguelike. Three toy-miniature heroes, one die
each. Roll, lock, reroll twice, then spend each die on a target. Enemies always show exactly
what they will do. Between fights you reshape the dice and pick up rule-bending items. A
winning run is 3 acts (12 fights) in about 15 minutes.

Everything is original: names, numbers, art, text.

## 2. Architecture

```
src/shared/    lead     types + roster + asset list: the contract (no logic beyond constants)
src/engine/    engine   pure TypeScript rules engine. No DOM, no Date, no Math.random, no imports
                        from content/ui/art. Exports createEngine(content): Engine
src/content/   designer all data. Exports CONTENT: ContentDB from src/content/index.ts
src/art/       art      runtime sprite lookup + src/art/generated/manifest.json
src/ui/        ui       all screens, input, animation, storage, PWA shell
tools/voxelgen art      voxel generator -> public/art/*.png, public/icons/*, public/gallery.html
tools/sim/     designer bots + balance simulation (headless, uses engine + content)
tools/check-content.ts  lead  content check
tests/e2e/     qa       Playwright (WebKit, iPhone viewport)
public/        ui owns manifest etc.; art owns public/art, public/icons, public/gallery.html
```

Dependency rule: `engine` imports only `shared`. `content` imports only `shared`. `ui`
imports `shared`, `engine`, `content`, `art`. Nothing imports `ui`. Use the `@shared/*`,
`@engine/*`, `@content/*`, `@art/*` path aliases.

The engine is a pure function of (state, action): `engine.apply(game, action)` returns a new
`GameState` and a list of `GameEvent`s. It never mutates its input. The UI renders state,
animates events, and saves after every action. Bots and tests call the same function.

### Randomness

No `Math.random` anywhere in engine, content or sim. All randomness is derived from the run
seed by hashing: `rand(seed, streamName, counter)`. `RunState.rng` holds one counter per
stream. Use separate streams so that player choices in one area never change another:

- `dice:<act>.<slot>` for hero dice in a fight
- `ai:<act>.<slot>` for enemy move picks and random targets
- `map:<act>` for encounters, doors, events
- `reward:<act>.<slot>`, `shop:<act>.<slot>`, `event:<act>.<slot>` for offers

Consequence: a daily run offers the same heroes, enemies, doors and rewards on every retry,
and reloading a save can never change an outcome.

### Saves

`SaveFile` (see state.ts) is JSON. The engine provides `save()` / `load()`; `load` validates
shape, runs migrations from older `version`s, and throws `SaveError` on garbage. Migrations
live in `src/engine/save/migrations.ts` as an ordered list `{ from, to, migrate }`; version 1
is the first. The UI writes the save to IndexedDB (with a localStorage fallback) after every
`apply`, calls `navigator.storage.persist()` once, and offers export/import of the same text
as a `.json` file.

## 3. The run

- Pick 3 unlocked heroes and a tier (0 = base; 1..5 unlock after the first win).
- 3 acts. Each act has combat slots 1, 2, 3 (fights) and 4 (boss).
- After each fight: gold, then a reward pick (1 of 3). Then, if the act is not over, a choice
  of two different doors, then the next combat:
  - `elite`: the next fight is the act's elite encounter instead; it pays more gold and gives
    `rules.eliteRewardPicks` reward screens with better rarity. Not offered before a boss.
  - `rest`: heal every hero `rules.restHealPct`% of max HP **or** upgrade one face.
  - `shop`: spend gold on items, faces, an upgrade, a heal.
  - `event`: a short text choice with stated outcomes.
  - `treasure`: free pick of one item from `rules.treasureChoices`.
  - `onward`: nothing, straight to the next fight (offered as the "safe" door).
  So a run has 9 door choices (before slots 2, 3 and 4 of each act).
- After a boss: heal `rules.bossHealPct`%, reward pick (boss rarity), next act starts at slot 1.
  After the Act 3 boss the run is won.
- Gold is a within-run resource only. Nothing carries between runs except feats and unlocks.
- Downed heroes come back at the start of the next fight with `rules.downedReturnHpPct`% HP.
- If every hero is down, the run is lost.

Target pacing: a fight is 2 to 4 turns; a boss 4 to 6. Whole winning run about 15 minutes.

## 4. A fight, step by step

Heroes stand in a row (index 0 = front). Enemies stand in a row (first = front), max 4.

**Fight start**: downed heroes return; shields clear; `fightStart` triggers; every enemy picks
its first intent; turn 1 begins.

**Turn start**
1. Hero normal shield is removed (Ward shield and `shieldPersists` shield stay). `regen` ticks on heroes.
2. Rerolls = `rules.rerollsPerTurn` + modifiers + `nextTurnRerolls` (min 0).
3. Every living hero's die is rolled. Dice jammed by an enemy last turn are marked `jammed`.
4. `turnStart` triggers. Phase = `rolling`.

**Rolling phase**: the player may `toggleLock` any die and `reroll` (costs 1 reroll; rerolls
every die that is not locked, not jammed; needs at least one such die). Rerolls are final:
they cannot be undone. Locks are free to toggle. The first die locked in a turn is flagged
`firstLocked` (the flag stays on that die for the turn even if unlocked later; no other die can get it).

**Rolling ends** the moment the player uses the first die (or presses End Turn). Then:
1. Sets are detected (section 6) and their die bonuses and bursts apply.
2. `rollEnd` and `setFormed` triggers fire. Phase = `acting`.
Leftover rerolls stay visible (items may care) but can no longer be spent.

**Acting phase**: `useDie(die, target)` in any order; each die once. `undo` steps back one
die use at a time, all the way to the moment rolling ended (restoring the `rolling` phase
with the same dice showing and the same rerolls left). Undo never crosses a reroll or End Turn.

**End Turn** (`endTurn`): `turnEnd` triggers fire, then the enemy phase:
1. Poison ticks on enemies (lose HP = stacks, ignoring shield; stacks -1). Dead enemies are removed.
2. Each living enemy, front to back, performs its intent actions in order. Enemy shield
   gained in a previous enemy phase is removed just before that enemy acts.
3. Poison ticks on heroes. `mark` and `weak` clear. `enemyPhaseEnd` triggers.
4. Every living enemy picks its next intent (targets resolved now and stored).
5. If all heroes are down: defeat. Else next turn.

The fight is won the instant the last enemy dies (even mid-turn). Unused dice are forfeited.

### Enemy intents are exact

An intent stores resolved hero indexes, per-hit amounts and (for curses) the exact face. The
enemy phase contains **no randomness**. Rules for surprises:
- If an intent's hero target is downed before the enemy acts, a single-target action
  retargets to the front living hero.
- `weak` on the enemy reduces each hit of its attacks this turn; strength gained by a buff
  earlier in the same enemy phase does apply (the forecast accounts for it).
- `engine.forecast(game)` simulates the whole enemy phase on the current state and returns
  exact HP loss per hero. `engine.previewDie` does the same for a die use. The UI shows both
  at all times; nothing the player is shown may differ from what then happens.

### Damage resolution

Direct damage to a unit: +`mark` stacks; then removed from normal shield, then ward, then HP
(`pierce` skips both shields). Poison and Reckless ignore shield and thorns. Thorns: after a
direct hit by a die or an attack, the attacker takes thorns stacks as direct damage (which
does not itself trigger thorns). A multi-hit attack triggers thorns per hit. Overkill is lost.
Healing cannot exceed max HP and cannot target a downed hero.

## 5. Dice faces

A face has an effect, a symbol (for sets), a value and keywords. Effects:

| effect | target | does |
|---|---|---|
| damage | one enemy | deal value |
| shield | one hero | give value shield (expires at the start of your next turn) |
| heal | one hero | restore value HP |
| weaken | one enemy | apply `weak` = value (its attacks this turn deal that much less per hit) |
| focus | none | +value rerolls next turn |
| blank | none | nothing; can still be "used" (does nothing) or left |

### Value pipeline (order matters; engine and UI must agree, so only the engine computes it)

1. base = face value (including upgrades) + fight growth; a cursed face is a blank (value 0, no symbol, no keywords).
2. `blankAs` modifiers turn a blank into an effect with a fixed value (still no symbol).
3. + `faceValue` modifiers (owner/party, filters, conditions).
4. + keyword bonuses: Momentum (`param` x rerolls spent this turn), Poised (`param` if no rerolls spent).
5. + `rerolledBonus` if this die was rerolled this turn.
6. + `DieState.bonus` (set die bonus, Rally, `dieBonus` effects).
7. x `firstLockMultiplier` if `firstLocked`, x `DieState.multiplier`. Round down. Minimum 0.
8. At resolution: Execute multiplies damage by `param` if the target is at or below half max HP.
9. Resolves 1 + (Twin ? 1 : 0) + `DieState.repeats` times.

### Keywords (12)

| keyword | rule |
|---|---|
| Cleave | Affects every unit on the targeted side (all enemies for damage/weaken; all living heroes for shield/heal). No target tap needed. |
| Echo | Becomes a copy of the neighbouring die's showing face: effect, base value, keywords (not its symbol; Echo keeps its own symbol for sets). The neighbour is the next living hero's die to the left, or to the right if there is none. Echo's own value is added as a bonus. Copying an Echo or having no neighbour gives a blank. |
| Growth | After each use, this face permanently gains +param for the rest of the fight. |
| Reckless | The user loses param HP when it resolves (ignores shield; cannot reduce the user below 1 HP). |
| Pierce | Ignores shield. |
| Venom | Instead of direct damage, applies Poison equal to the value. |
| Ward | Shield from this face is Ward shield: it does not expire. |
| Twin | Resolves twice. |
| Rally | When used, every other unused hero die gets +param this turn. |
| Momentum | +param value for each reroll spent this turn. |
| Poised | +param value if no rerolls have been spent this turn. |
| Execute | Damage is multiplied by param against a target at or below half its max HP. |

## 6. Sets

Detected once, when rolling ends, over the showing faces of living heroes' dice (a blank or
cursed face has no symbol and joins nothing; `wildSymbol` dice count as whichever symbol
gives the best set).

- **Pair**: two dice share a symbol. Each of the two gets `dieBonus`.
- **Triple**: three dice share a symbol. Each gets the (larger) `dieBonus`, and the symbol's
  **burst** fires once (for example Blade: damage to all enemies; Guard: shield to all heroes).
- **Rainbow** (only with an `enableRainbow` item): three different symbols. Small `dieBonus` to each.

With three dice at most one set forms. The numbers and bursts are data (`ContentDB.sets`).
The UI previews, while the player is still rolling, which set the current dice would form.

## 7. Items

Each hero has `itemSlots` slots (2). An item is a list of always-on `Modifier`s and/or
`TriggeredEffect`s (see content.ts for every type). `owner` means the hero holding it;
`party` means everyone. An item on a downed hero is inactive, except triggers on `heroDowned`.
Taking an item with all the hero's slots full replaces one (the old item is discarded).
28 items are in the base pool; 12 are `locked` and join the pool when their feat is done.
Item text must describe the rule exactly, with numbers.

## 8. Enemies

Each enemy has HP, moves, and an AI (`cycle` or seeded `weighted`), optional HP `phases`,
and optional `passives` (same trigger system as items; `self` = this enemy). Dice tricks:

- `lockDie`: next turn that hero's die is **jammed**: rolled once, cannot be rerolled.
- `curseFace`: one face of that hero's die becomes blank for the rest of the fight. The
  intent shows exactly which face.
- `stealReroll`: next turn the party has fewer rerolls.

Tricks are stopped by killing the enemy before it acts, or by `trickImmune` items. They are
always shown in the intent. Design rule: no encounter may contain more than 2 trick users,
and Act 1 fight 1 contains none.

Bosses (one per act) each have one mechanic no other enemy has, stated in `passiveText`
and shown on the boss's info sheet:

- **The Bramble King**: alternates between Thorn Stance (high thorns: hitting him hurts) and
  Open turns; summons Bramble Imps. Reward patience and Venom/Pierce.
- **The Drowned Bell**: each toll jams one telegraphed die; a visible countdown ends in a
  party-wide crash unless enough damage is dealt to crack the bell first (phase change).
- **The Pip Eater**: curses faces to blank and gains strength for every blank the party is
  showing when it acts. Blank-synergy builds turn this against it.

## 9. Fairness rules (hard requirements)

1. Every enemy action is visible a full player turn before it happens, with exact numbers.
2. Every die shows exact results before the player commits (`previewDie`), and the End Turn
   button shows the exact incoming damage per hero (`forecast`), including "would be downed".
3. No unavoidable deaths: with the starting party at full HP, no encounter may be able to
   wipe the party before the player has had 2 full turns, and no single enemy phase in Act 1
   may deal more than 60% of a full-HP starter hero's HP to that hero. The sim checks this.
4. No hidden randomness after the roll: once dice are showing, everything is deterministic.
5. Event choices state their outcomes before the player picks.

## 10. Difficulty and balance targets (enforced by `npm run sim`, never to be loosened)

Measured over at least 2,000 seeded runs per bot at tier 0:

- Skilled bot wins between 20% and 35% of runs.
- Careless bot clears Act 1 in at least 50% of runs (and wins well under the skilled bot: at most 8%).
- At least 6 distinct named strategies, each winning between 15% and 40% of runs when the
  skilled bot commits to it (at least 2,000 runs per strategy). No strategy above 40%.
- Median winning run length is consistent with ~15 minutes: at most 45 player turns.
- Fairness rule 9.3 holds for every encounter.

The six-plus strategies (each needs heroes, faces and items that make it real):

1. **Sets** (pairs and triples, wild symbol, set-bonus items)
2. **Venom** (poison stacking and spreading)
3. **Fortress** (shield, Ward, thorns, shield-into-damage)
4. **Growth** (scaling faces, long fights, Rally)
5. **Reckless** (low-HP bonuses, Execute, big single hits)
6. **Blanks** (blank faces that deal damage / give shield; curses help you)
7. **Tempo** (rerolls: Momentum, rerolled bonuses, Focus)
8. **Echo** (Echo/Twin copying one great face)

The bots: **careless** uses dice in order on the first legal target, never locks, rerolls
only blanks, picks rewards at random. **Skilled** searches lock/reroll choices by expected
value, sequences dice using `previewDie`/`forecast` (kills before tricks land, blocks lethal),
and drafts toward a strategy. Both use only the public `Engine` interface.

Tiers 1 to 5 (unlocked one at a time by winning the tier below): each adds exactly one enemy
trick on top of the previous tiers (`ContentDB.tiers`). The sim reports their win rates but
only tier 0 has thresholds.

## 11. Meta progress

- **Feats** (20): data-driven tests over engine-tracked counters (`StatKey`) at turn, fight,
  run or lifetime scope, checked at `when`. Feats unlock the 5 non-starter heroes and the 12
  locked items. No currencies, no grinding: at most 3 feats may be simple "do X runs" counts.
- **Tiers**: first win unlocks tier 1; winning tier N unlocks N+1 (max 5).
- **Collection**: `Profile.seen` records every hero used, item offered or held, enemy fought.
- **Stats**: runs, wins, win rate, current and best streak, per-hero records, feats done.
- **Daily**: `startDaily(dateKey)` uses `dailySeed(dateKey)`, a fixed party from **all** 8
  heroes (regardless of unlocks), tier 0, and the full item pool. Identical on every retry.
  `Profile.daily[dateKey]` keeps attempts and best score. The UI supplies the local date.
- **Tutorial**: `startTutorial` runs `ContentDB.tutorial`: a fixed seed, fixed party and one
  easy encounter. The run ends after that one fight (victory screen), sets
  `profile.tutorialDone`, counts for no stats or feats. The UI overlays step-by-step prompts
  that wait for the player to do each thing (roll, lock, reroll, target, read an intent).
  The tutorial fight must be winnable by any sequence of legal actions within reason: the
  enemy must not be able to down a hero in under 6 turns.

## 12. Screens (ui)

Portrait only, 100dvh, no scrolling in play. Layout top to bottom during a fight:

```
[ safe-area top ]
[ status bar: act / fight pips, gold, tier, menu ]             ~8%
[ enemy row: sprites on bases, HP bars, intent bubbles ]       ~34%
[ hero row: sprites, HP, shield, incoming-damage forecast ]    ~22%
[ dice tray: 3 big dice (>= 64px), set preview banner ]        ~18%   <- thumb zone
[ action bar: Reroll (n) | Undo | End Turn ]                   ~12%   <- thumb zone
[ safe-area bottom ]
```

- Tap a die in rolling phase: lock/unlock. Tap **Reroll**. Tap **Use dice** (or simply tap a
  die again once no rerolls remain) to move to acting; in acting, tap a die to select it
  (valid targets pulse and show the exact preview), tap a target to use it. No-target dice
  resolve on a second tap. Long-press any die, hero, enemy, item or intent for an info sheet.
- All interactive elements at least 44x44 CSS px. Primary buttons in the bottom 40%.
- Screens: Title/Home, Hero select (+ tier), Fight, Reward, Doors, Rest, Shop, Event,
  Victory, Defeat, Collection (heroes / items / enemies tabs), Feats, Stats, Daily, Settings
  (reduce motion, replay tutorial, export, import, reset with confirm), Tutorial overlay,
  Rotate-to-portrait overlay, Info sheets.
- Animation: CSS transforms only (slide, hop, shake, flash, number pop, dice flipping through
  faces). No animation loop while idle (no requestAnimationFrame running when nothing moves).
  `reduceMotion` (and the OS setting) replaces motion with instant changes and short fades.
- Sprites are pixel art: draw at integer scales with `image-rendering: pixelated`.
- Resume: on launch, load the save; if a run is in progress go straight back into it.

## 13. Art (art)

See BRIEF.md "Art" for the style rules; they are requirements. Contract:

- `npm run art` regenerates everything, deterministically, with no network access:
  `public/art/<assetId>.png` for every id in `ASSET_LIST` (src/shared/assets.ts),
  `public/icons/*` (`APP_ICON_FILES`), `public/gallery.html`, and
  `src/art/generated/manifest.json` (type `ArtManifest`).
- `src/art/index.ts` exports `sprite(id): SpriteInfo` (throws on unknown id),
  `spriteUrl(id): string` (prefixed with `import.meta.env.BASE_URL`), and `hasSprite(id)`.
- Characters: native size about 48 to 96 px so they are crisp at 64 to 128 CSS px. Bosses about
  1.5x. Icons 16 or 24 px native. Backgrounds 180x320 native (scaled up, pixelated).
- Generated files are committed so the app builds without running the generator.
- The gallery lists every sprite with its id and name, grouped by category.

## 14. Tooling

`npm run verify` runs, in order, stopping at the first failure: typecheck, lint, unit tests,
content check, balance sim, production build, Playwright. Never weaken a test or threshold.
Node is not on this machine's PATH; see CLAUDE.md for how to run commands.
