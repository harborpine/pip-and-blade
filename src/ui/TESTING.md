# UI testing guide (for qa)

Run the app: `npm run dev` (http://localhost:5173/pip-and-blade/) or the production build via `npm run preview`
(http://127.0.0.1:4173/pip-and-blade/). Every interactive element has a `data-testid`; use
`page.getByTestId(...)`. The current screen is `document.body.dataset.screen`.

Playwright iPhone 14 has a 390x664 viewport (Safari chrome removed). The layout adapts to the height:
check 390x844, 390x664 and 375x667.

## Debug hook: `window.__pip`

| member | what it does |
|---|---|
| `getState()` | current `GameState` (`{ profile, run }`), plain JSON |
| `getSave()` | the whole `SaveFile` (game + settings) |
| `engine` | the engine (`dice(g)`, `previewDie(g, die, target?)`, `forecast(g)`, `previewSets(g)`, `canApply`, `legalActions`, `whyIllegal`, `dailyHeroes(key)`...) |
| `screen()` | current screen name (same as `<body data-screen>`) |
| `dispatch(action)` | sends an `Action` through exactly the same path as a tap (applies, saves to storage, re-renders the screen, starts the animations). Returns the events. Throws `IllegalActionError` if illegal. |
| `canDispatch(action)` | `engine.canApply` on the current state |
| `startRun(heroes, tier?, seed?)` and `setSeed(heroes, seed, tier?)` | start a standard run with a fixed seed (deterministic play) |
| `waitIdle()` | promise that resolves when nothing is animating. |
| `isIdle()` | true when nothing is animating |

### The `waitIdle()` contract

`dispatch` and every tap update the DOM synchronously and start their animations before they return, so
`await page.evaluate(() => window.__pip.waitIdle())` right after a `dispatch` or a click is always safe:
it resolves only after the damage pops, HP bar changes, dice flips and screen changes have finished
(leaving a fight waits for its last animations, then swaps screens; `waitIdle` covers that swap too).
With reduced motion on (`page.emulateMedia({ reducedMotion: 'reduce' })` or the in-game setting) everything is
near-instant. After `waitIdle()` there are no running animations: `document.getAnimations().length === 0` and no
timers or requestAnimationFrame loops are pending (checked on every screen).

Between `dispatch` and `waitIdle()` the DOM already shows the final state except the HP bars and dice faces,
which update as their hit or flip lands. Read HP from `getState()` for exact numbers, or after `waitIdle()`.

## Screens (`<body data-screen="...">`, root element `data-testid="screen-<name>"`)

`home`, `heroselect`, `fight`, `reward`, `doors`, `rest`, `shop`, `event`, `victory`, `defeat`,
`collection`, `feats`, `stats`, `daily`, `settings`. A run in progress always shows its own screen
(the Home screen is only reachable with no run).

## Test ids

**Home**: `btn-new-run`, `btn-daily`, `btn-collection`, `btn-feats`, `btn-stats`, `btn-settings`, `title`.
First launch (tutorial not done and not offered before): modal `tutorial-offer` with `tutorial-offer-yes` / `tutorial-offer-no`
(the "offered" flag is `localStorage['pip-and-blade.tutorialOffered']`; set it to `'1'` to suppress the offer in tests).

**Hero select**: `hero-pick-<heroId>` (toggle; attribute `aria-pressed`), `party-count`, `btn-start-run`,
`tier-<n>` buttons (only once a tier is unlocked), `tier-text`, `btn-back`. Long-press a hero card for its info sheet.

**Fight**
- `screen-fight`, `fight-progress` (act and fight pips), `gold`, `tier`, `btn-menu`
  (`menu-modal`, `menu-resume`, `menu-settings`, `menu-abandon`, `confirm-abandon` + `-confirm`/`-cancel`).
- Dice: `die-<i>` (i = index in `engine.dice()`; attributes `data-effect`, `data-value`, `data-face`, `data-locked`,
  `data-used`, `data-hero`), `die-value-<i>`. Classes: `locked`, `jammed`, `used`, `selected`, `cursed`, `unusable`.
  Face icons may be cycling during a flip (about 0.5 s); wait with `waitIdle()` before reading the face.
- Tray: `dice-tray` (attribute `data-mode="lock" | "act"`), `mode-pill`, `hint-line`, `turn-label` is inside `mode-pill`, `set-banner`
  (attribute `data-set-kind` when a set is shown).
- **Modes.** While rolling there are two UI modes. `lock` (blue tray): tapping a die toggles its lock. `act` (gold tray): tapping a die selects
  it. The UI switches to `act` automatically when no reroll is possible (0 left, or every die locked/jammed) and after the first die is used.
  `btn-use-dice` switches to `act` by hand; `btn-back-to-lock` (labelled "Lock", shown in `act` while still rolling) goes back and stops the
  automatic switch for the rest of that turn.
- Using a die: tap `die-<i>` (selects it; valid targets get class `targetable` and show `preview-enemy-<uid>` / `preview-hero-<i>`), then tap
  the target (`enemy-<uid>` or `hero-<i>`). A die with no target (`needsTarget: false`) is used by tapping it a second time.
- Actions: `btn-reroll` (`rerolls-left` is its label), `btn-use-dice`, `btn-back-to-lock`, `btn-undo`, `btn-end-turn`
  (+ `end-turn-forecast` text; class `down` or `wipe` when a hero would be downed / the party wiped).
  If a hero would be downed, End Turn first shows `confirm-end-turn` (`confirm-end-turn-confirm`, `confirm-end-turn-cancel`).
  `btn-reroll` is disabled when `engine.canApply(reroll)` is false.
- Units: `enemy-<uid>` (attributes `data-enemy-uid`, `data-enemy-id`; tap it when no die is selected to open its info sheet; boss info shows
  the boss mechanic), `intent-<uid>` (tap or long-press: intent sheet), `enemy-hp-<uid>` and `hero-hp-<i>` (attributes `data-hp`, `data-max`, `data-sh`;
  they change when the hit lands), `hero-<i>` (tap with no die selected: hero sheet), `hero-items-<i>` (item icons, tap for the item sheet),
  `forecast-<i>` (text `-N`, `safe`, `blocked` or `DOWN!`), `jam-warning-<i>`, `status-<statusId>` (chips with counts).
- Tutorial: `tutorial-card` (attribute `data-step`: `intent`, `lock`, `reroll`, `usemode`, `target`, `end`), `tutorial-text`, `tutorial-skip`.
  Class `tut-focus` marks the element to use. Steps wait for the real action; `__pip.dispatch` of the same action also advances them.
- Overlays: `toast`, `info-sheet` variants (`info-die`, `info-hero`, `info-enemy`, `info-intent`, `info-item`, `info-set`, `info-keyword`), `info-close`.
- Effects: `banner-victory` appears briefly when the last enemy dies.

**Reward**: `reward-option-<i>` (attribute `data-type`: `face`, `upgrade`, `item`), `btn-skip-reward`. After tapping an option a bottom sheet asks
for the details: `choose-face` (faces `face-slot-<n>`), `choose-hero` (`place-hero-<i>`), `choose-replace-item` (`replace-item-<n>`); each sheet has a
Cancel button (`<sheetid>-cancel`).

**Doors**: `door-<i>` (attribute `data-kind`).
**Rest**: `btn-rest-heal`, `btn-rest-upgrade` (then `choose-hero` and `choose-face` sheets), `btn-leave`.
**Shop**: `shop-slot-<i>` (attribute `data-type`: `item`, `face`, `upgrade`, `heal`; disabled when sold or too expensive), `btn-leave`.
**Event**: `event-text`, `event-choice-<i>`, `btn-leave` (labelled Continue).
**Victory / Defeat**: `end-title`, `end-lines`, `end-feats`, `btn-continue`.

**Collection**: `tab-heroes`, `tab-items`, `tab-enemies`, `coll-count`, tiles `coll-hero-<id>`, `coll-item-<id>`, `coll-enemy-<id>`
(attribute `data-known`). **Feats**: `feats-count`, `feat-<id>` (attribute `data-done`). **Stats**: `stat-runs`, `stat-wins`, `stat-winrate`,
`stat-streak`, `stat-best-streak`, `stat-tier`, `stat-feats`, `stat-daily-wins`, `stat-hero-<id>` (each has a `<id>-value` child).
**Daily**: `daily-date`, `daily-best`, `btn-start-daily`, `daily-history`, `daily-<date>`.

**Settings**: `btn-back`, `btn-reduce-motion` (`aria-checked`), `btn-replay-tutorial`, `btn-export` (downloads `pip-and-blade-<date>.json`),
`btn-import` + `input-import` (file input; use `setInputFiles`), `confirm-import` (+ `-confirm`/`-cancel`), `btn-reset`,
`confirm-reset` (+ `-confirm`/`-cancel`).

**Global**: `rotate-overlay` (visible only in landscape on a phone), `toast`.

## Behaviour notes

- Saves are written after every action (IndexedDB plus a synchronous localStorage mirror). Reloading the page returns to the same screen and
  the same state. Key: localStorage `pip-and-blade.save`.
- The Daily date is the LOCAL calendar date (`YYYY-MM-DD`).
- No audio, no network requests at runtime (other than loading the app files).
- Long-press = holding a pointer down about 0.45 s without moving (Playwright: `mouse.down()`, wait 600 ms, `mouse.up()`).
