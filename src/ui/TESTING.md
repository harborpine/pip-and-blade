# UI testing guide (for qa)

Run the app: `npm run dev` (http://localhost:5173/pip-and-blade/) or the production build via `npm run preview`
(http://127.0.0.1:4173/pip-and-blade/). Every interactive element has a `data-testid`; use
`page.getByTestId(...)`. The current screen is `document.body.dataset.screen`.

Playwright iPhone 14 has a 390x664 viewport (a Safari tab on a standard iPhone). The layout adapts to the height: tab sizes
390x664, 393x659, 402x681; Home Screen sizes 390x844, 393x852, 402x874; small 375x667 and 375x548. Dice are always 84 px wide (art's 2x).

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

**Fight** (0.2.0: there are NO modes; `btn-use-dice`, `btn-back-to-lock` and `mode-pill` do not exist)
- `screen-fight`, `fight-progress` (act and fight pips), `gold`, `tier`, `btn-menu`
  (`menu-modal`, `menu-resume`, `menu-settings`, `menu-abandon`, `confirm-abandon` + `-confirm`/`-cancel`).
- Tray: `dice-tray` (attribute `data-phase="rolling" | "acting"`), `turn-label` (text `TN`, e.g. `T3`; `aria-label` `Turn N`), `hint-line` (one sentence; class `note`
  while it shows a one-off explanation), `set-banner` (attribute `data-set-kind` when a set is shown).
- Dice: `die-<i>` (i = index in `engine.dice()`; attributes `data-effect`, `data-value`, `data-face`, `data-locked`, `data-jammed`,
  `data-used`, `data-hero`, `data-targets` = how many targets it may be aimed at, 0 when it needs none), `die-value-<i>`.
  Classes: `locked`, `jammed`, `used`, `selected` (lifted), `cursed`, `blank`, `unusable`, and `using` for the moment its copy is flying.
  Face icons cycle during a roll; wait with `waitIdle()` before reading the face.
- **Tapping a die always means "use it".**
  - needs no target (`data-targets="0"`, not blank): ONE tap dispatches `useDie`.
  - exactly one target (`data-targets="1"`): ONE tap dispatches `useDie` on that target.
  - several targets: the die lifts (class `selected`), every valid target gets class `targetable` and shows `preview-enemy-<uid>` /
    `preview-hero-<i>`; tap a target (`enemy-<uid>`, including its intent bubble, or `hero-<i>`) to use it. Tapping the die again, tapping
    empty space (e.g. the status bar), tapping a unit that is not a target, or tapping another die puts it down (another die then follows
    its own rule). Nothing is dispatched by lifting or putting down.
  - a pure blank (`data-effect="blank"`): never dispatches; the die shakes and `hint-line` reads `Blank: nothing to use`.
  - used die / downed hero: never dispatches; shake and `hint-line` says why (`Already used this turn.` ...).
  - Setting "Always choose the target myself" on (`btn-choose-target`, or prefs `{"chooseTarget":true}`): one-target dice lift and wait too.
    No-target dice still fire on one tap.
- Padlocks: `lock-<i>` directly under `die-<i>` (84x44; it overlaps the foot of its die by 10 px, 20 px on `tight` layouts; attributes `data-locked="true|false"`, `data-jammed="true|false"`,
  `aria-pressed`; classes `open` / `closed` / `chain`). A tap dispatches `toggleLock`. They are usable only while a reroll could still
  happen (`phase === 'rolling'` and `rerollsLeft > 0`); otherwise they carry class `gone` (invisible, not tappable, `aria-hidden`) but keep
  their place so the dice do not jump. A jammed die shows the chain: tapping it changes nothing and `hint-line` reads
  `Jammed by an enemy: cannot be rerolled this turn`. `lock-first-<i>` ("1st") appears on the first die locked this turn only when a held
  item has a `firstLockMultiplier` modifier.
- Actions (always these three, in this order): `btn-reroll`, `btn-undo`, `btn-end-turn`.
  - `btn-reroll`: attributes `data-rerolls` (= `rerollsLeft`), `data-state`: `ready` (a tap rerolls every die that is not locked or jammed),
    `blocked` (rolling, but `canApply(reroll)` is false), `over` (a die was used with rerolls unspent: reads `Rolling over`),
    `spent` (acting, none left). In every state but `ready` it has `aria-disabled="true"` (Playwright sees it as disabled: use
    `tap({ force: true })` to press it anyway); pressing it then changes nothing and `hint-line` explains: `No rerolls left`,
    `Every die is locked`, or `Rolling ended when you used a die. Undo brings your rerolls back.` `rerolls-left` holds the number
    (absent in state `over`).
  - Using the first die ends rolling: `btn-reroll` goes to `over`, the padlocks get `gone`, and `hint-line` reads
    `Changed your mind? Undo brings your rerolls back.` (while exactly one die is used, rerolls are unspent and undo is possible).
  - `btn-undo`: one step per tap; natively `disabled` when `canApply(undo)` is false. Undoing the first die restores rolling, the
    rerolls, locks and HP exactly.
  - `btn-end-turn` (+ `end-turn-forecast` text; class `down` or `wipe` when a hero would be downed / the party wiped).
    If a hero would be downed it first shows `confirm-end-turn` (`confirm-end-turn-confirm`, `confirm-end-turn-cancel`); its text ends with
    `N dice unused.` / `1 die unused.` when usable non-blank dice remain. With no danger it ends the turn at once.
- Long-press a die (hold about 0.35 s): "peek". Opens `info-die` WITHOUT using the die; the sheet has `peek-lines` (one exact preview per
  target) and the targets show their `preview-…` chips while the sheet is open. Closing the sheet removes them.
- Tap budget: three dice with one possible target each = 3 taps + End Turn. Keep two dice and reroll once = `lock-a`, `lock-b`,
  `btn-reroll` = 3 taps. A die with several targets = 2 taps.
- **Input while animating.** With normal motion a die use holds further fight input until its flying copy lands (about 0.31 s, always
  under 0.45 s); a roll holds it until the dice show their faces; End Turn holds it until the enemies have acted and the new dice
  have landed. Taps made meanwhile are queued (up to 4) and run in order when the hold ends: they are not dropped. Two exceptions, on
  purpose: a queued tap is forgotten if the turn it was made in is over, and `btn-end-turn` ignores presses while input is held
  (so a double press can never end the next turn unseen). With reduced motion nothing is held. `waitIdle()` covers the hold and
  every queued tap, so "tap, tap, tap, `waitIdle()`" is safe. `__pip.dispatch` is never held.
- Units: `enemy-<uid>` (attributes `data-enemy-uid`, `data-enemy-id`; with no die lifted a tap opens its info sheet; boss info shows
  the boss mechanic), `intent-<uid>` (tap or long-press: intent sheet, when no die is lifted), `enemy-hp-<uid>` and `hero-hp-<i>`
  (attributes `data-hp`, `data-max`, `data-sh`; they change when the hit lands), `hero-<i>` (tap with no die lifted: hero sheet),
  `hero-items-<i>` (item icons, tap for the item sheet), `forecast-<i>` (text `-N`, `safe`, `blocked` or `DOWN!`), `jam-warning-<i>`,
  `status-<statusId>` (chips with counts).
- Tutorial (5 steps): `tutorial-card` with `data-step` = `intent` (tap an intent bubble), `lock` (tap a padlock), `reroll` (press Reroll),
  `use` (use dice; `data-sub` = `first`, then `target` while a die is lifted, then `more`; ends when two dice are used or none are left),
  `end` (press End Turn), then `done`. `tutorial-text`, `tutorial-skip` (labelled Skip, or Close on the `done` card). Class `tut-focus` marks
  what to tap. Steps wait for the real action; `__pip.dispatch` of the same action also advances them; doing a later step's action
  skips ahead. Replay from Settings (`btn-replay-tutorial`).
- Overlays: `info-sheet` variants (`info-die`, `info-hero`, `info-enemy`, `info-intent`, `info-item`, `info-set`, `info-keyword`, `info-fury`),
  `info-close`. The fight screen no longer uses `toast` for dice messages: they are in `hint-line`.
- Effects (all in `.fx-layer`, removed when finished): `.die-ghost` (the flying copy), `.burst`, `.ribbon` + `.ribbon-tag` (set formed),
  `banner-victory` appears briefly when the last enemy dies.

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

**Settings**: `btn-back`, `btn-reduce-motion` (`aria-checked`), `btn-choose-target` (`aria-checked`; "Always choose the target myself", default off, stored in prefs), `btn-replay-tutorial`, `btn-export` (downloads `pip-and-blade-<date>.json`),
`btn-import` + `input-import` (file input; use `setInputFiles`), `confirm-import` (+ `-confirm`/`-cancel`), `btn-reset`,
`confirm-reset` (+ `-confirm`/`-cancel`), `app-version` (text `Version 0.2.0`, from the build).

**Global**: `rotate-overlay` (visible only in landscape on a phone), `toast`.

## The toy-set look (0.2.0): what it means for tests

- Titles, button labels and numbers are drawn with art's pixel fonts: each character is its own invisible glyph box inside a
  `.px` span, so `textContent` still gives the words exactly as written (`End Turn`, `20/20`, `-3`); match text
  case-insensitively if you compare what is SEEN (the font is capitals only). Toggles (`btn-reduce-motion`, `btn-choose-target`)
  show kit art; read their state from `aria-checked` (their `On`/`Off` text is still in the DOM, invisible).
- Fight details that changed with the restyle: enemy names are not shown under normal enemies (bosses keep theirs);
  `end-turn-forecast` text is now `4/0/3` (damage per hero), `no damage`, `safe, -1 reroll`, `<Name> down!` or `PARTY WIPE!`, and
  its `aria-label` is the full sentence (`incoming 4/0/3`); `preview-enemy-<uid>` / `preview-hero-<i>` now sit ON the target's
  health bar (inside `enemy-hp-<uid>` / `hero-hp-<i>`) and hold icon + number parts (`-3`, `+2`, `KO`), with the words in
  `aria-label` (`-3 HP`, `+2 shield`, `KO, -3 HP`); `forecast-<i>` text is still `-N`, `safe`, `blocked` or `DOWN!`;
  `rerolls-left` is the number inside `Reroll` / `N left`; in state `over` the button text is `Rolling over`;
  `set-banner` is a 44 px button around a low chip; `btn-menu` is the gear; the padlocks' words (`Keep`, `Kept`, `Jammed`) are
  in the DOM but not drawn (the art says it).
- On the very smallest layouts (class `tight` on `screen-fight`: 375x548, and boss or four-enemy fights in a tab) intents show
  icon + number only (the full line is each one's `aria-label`) and are part of their enemy's tap target (no `role="button"` of their
  own, no pointer under the bubble), names are hidden, `hero-items-<i>` stand beside the miniature (top right of `hero-<i>`, still
  44x44 each) instead of in a row under it, and the padlocks overlap the foot of their dice by up to 20 px. While the tutorial card
  is showing on a `tight` layout the status bar (`fight-progress`, `gold`, `btn-menu`) is hidden: the card takes its place.
  Known limit: the tutorial's first fight at 375x548 still overlaps a little (enemy health bars under the heroes' forecast chips).
- Sheet titles are short now: `Replace which face?`, `Upgrade which face?`, `Whose face?`, `Who carries it?`, `No free slot`
  (the hero and item names are in the hint line under the title).

- Pictures: the interface kit, backdrops and font sheets are fetched once at start-up and given to the style sheet as the
  pictures themselves; the first screen waits for that (at most 2.5 s) and `waitIdle()` covers it, so a screenshot taken after
  `waitIdle()` never shows a tray, bubble or panel without its frame. `<div id="kit-warm">` in `<body>` is an invisible 1 px
  helper for this, not content. Item and door pictures are cropped boxes (`.picture`): 2 CSS px per pixel on reward cards,
  doors and the item sheet, 1 in shop rows and item rows; the party strip shows whole miniatures at 1 (`.portrait`).

## Scrolling (0.2.0)

The page never scrolls. Everything that can be taller than its space is the ONE scroll container: class `scroll-y`,
`data-testid="scroll-<name>"`, attributes `data-overflow`, `data-more-top`, `data-more-bottom` (`"true"` while content is hidden that
way; the edge fades as the hint). A finger scrolls it only when it really overflows (`data-overflow="true"`); when it fits, the
touch is swallowed like anywhere else on the page.

| container | where |
|---|---|
| `scroll-choose-face`, `scroll-choose-hero`, `scroll-choose-replace-item` | the list inside the bottom sheets `choose-face` (replace a face / upgrade a face), `choose-hero`, `choose-replace-item`; the title and the Cancel button stay pinned |
| `scroll-info-die`, `-info-hero`, `-info-enemy`, `-info-intent`, `-info-item`, `-info-set`, `-info-keyword`, `-info-fury`, `-info-hero-def`, `-info-hero-locked`, `-info-enemy-def` | body of each info sheet (`info-close` stays pinned) |
| `scroll-<modal testid>` e.g. `scroll-menu-modal`, `scroll-confirm-reset`, `scroll-tutorial-offer` | body text of every centred dialog (buttons pinned) |
| `scroll-reward` (also treasure), `scroll-doors`, `scroll-rest`, `scroll-shop`, `scroll-event` (text, choices and result), `scroll-victory`, `scroll-defeat` | the middle of each between-fight screen |
| `scroll-heroselect`, `scroll-collection` (all 3 tabs), `scroll-feats`, `scroll-stats`, `scroll-daily` (contains `daily-history`), `scroll-settings` | menu screens |

The fight screen and Home have no scroll container: they are laid out to fit.

Testing a finger: Playwright WebKit on Windows cannot construct `Touch` objects and does not scroll natively from script-made
touches. What works: dispatch `touchstart` / `touchmove` / `touchend` events (plain `Event` objects with `touches`,
`targetTouches`, `changedTouches` defined, `bubbles: true, cancelable: true`) at `document.elementFromPoint(x, y)` and assert that
no `touchmove` comes back `defaultPrevented` when the container overflows (that cancellation is exactly what stopped Safari
scrolling in 0.1.0), then scroll with `el.scrollTop` / a wheel and assert the last item is inside the container and is what
`elementFromPoint` returns at its centre. Chromium (also installed) scrolls natively from DevTools-protocol touches
(`Input.dispatchTouchEvent`) if a true native check is wanted; the first tap after such a drag is swallowed by the browser.

Sizes: heights come from `--app-h` = `min(100dvh, --vvh)`, where `--vvh` is `visualViewport.height` kept current by script.
`#app` and `#overlays` are exactly that tall; `document.scrollingElement.scrollTop` stays 0.

**Home Screen tip**: in a browser tab (not standalone) Home shows `install-tip` once, with `install-tip-dismiss` ("Got it").
Interface preferences live in localStorage `pip-and-blade.prefs` (JSON: `installTipDismissed`, `chooseTarget`; missing or
broken = defaults). To hide the tip in a test, set `{"installTipDismissed":true}` there before the app starts.

## Behaviour notes

- Saves are written after every action (IndexedDB plus a synchronous localStorage mirror). Reloading the page returns to the same screen and
  the same state. Key: localStorage `pip-and-blade.save`.
- The Daily date is the LOCAL calendar date (`YYYY-MM-DD`).
- No audio, no network requests at runtime (other than loading the app files).
- Long-press = holding a pointer down about 0.35 s without moving (Playwright: `mouse.down()`, wait 450 ms, `mouse.up()`).
- Old saves: `tests/fixtures/save-v0.1.0.json` loads straight into its fight (put it in localStorage `pip-and-blade.save` as
  `{"t":1,"text":"<file text>"}` before the app starts). "Reset progress" also clears `pip-and-blade.prefs`.
