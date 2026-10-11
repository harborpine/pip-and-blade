# Redesign 0.2.0 ("one toy set"): specification

Read `BRIEF-2.md` first (the owner's words and the requirements). This file is the exact
specification teammates build against. `docs/design.md` still describes the game rules;
where the two differ about the interface, this file wins.

The owner played 0.1.0 on a standard-size iPhone **in a Safari tab** and reported: a sheet
that cannot be scrolled, icons and interface that do not match the characters, and an
awkward lock-then-use dice flow. They love the characters. Nothing about game rules or
numbers changes in this update.

## A. Scrolling

**Rule.** The page never scrolls, bounces or zooms. Any region whose content can be taller
than its box scrolls *inside itself* with a finger.

Implementation contract (ui):

- One reusable scroll container (class `scroll-y`): `overflow-y: auto`,
  `-webkit-overflow-scrolling: touch`, `overscroll-behavior: contain`, `touch-action: pan-y`,
  `min-height: 0` inside flex/grid parents. Every sheet body and every list uses it.
- Any global `touchmove` / gesture blocker must let touches that start inside a `scroll-y`
  element through. `touch-action: none` or `manipulation`-only on `html`/`body` must not
  cancel panning inside scroll containers. Find and fix the actual cause first and write it
  down in `docs/DECISIONS.md`.
- Heights use `100dvh` with a fallback driven by `window.visualViewport.height` (Safari's
  toolbars change the visible height in a tab). Sheets are capped at the visible height
  minus safe areas; their header and their action buttons stay pinned, the middle scrolls.
- "More below" hint: a fade at the edge that still has hidden content (top and/or bottom),
  removed when the end is reached. No permanent scrollbars required.
- Prefer fitting: lay content out so it fits at 390x664 where reasonable; scroll is the
  safety net, never the excuse for a cramped layout.
- Each scroll container gets `data-testid="scroll-<name>"` and its last child must be
  reachable. Audit list: replace-a-face sheet, upgrade-a-face sheet, reward, treasure, shop,
  rest, event (+ result), hero / enemy / boss / item / die / intent / fury info sheets,
  hero select, collection (3 tabs), feats, stats, daily (history), settings, victory,
  defeat, the fight menu.

Test contract (qa): real touch gestures (WebKit touch events via CDP-free means: Playwright
`page.touchscreen` is tap-only, so dispatch a `touchstart`/`touchmove`/`touchend` sequence
or use `locator.dispatchEvent` with Touch objects, plus a wheel fallback assertion), at tab
sizes 390x664, 393x659, 402x681, home-screen sizes 390x844, 393x852, 402x874, and the small
sizes 375x667 and 375x548. For every audited container with overflow: scroll to the end by
finger, assert the last item's box is fully inside the container's visible box and that a
tap at its centre hits it. Assert `document.scrollingElement.scrollTop === 0` throughout.
Also keep one test that fails on the old bug (a sheet taller than the screen whose bottom
cannot be reached).

**Tab vs installed.** Both must work. When running in a browser tab (not standalone) show,
once, a small dismissible card on the Home screen: "Tip: add Pip & Blade to your Home Screen
for a bigger play area" with the three steps (Share, Add to Home Screen, Add). Remember the
dismissal in settings storage. Never show it in standalone mode or during a run.

## B. Dice: tap to use, a padlock under each die

There are no modes. Remove the "Use dice" and "Lock" buttons and the LOCK/USE pill.

### Layout of the tray (bottom of the fight screen, thumb zone)

```
[ hint line: one short sentence, changes with context ]
[  die 0  ] [  die 1  ] [  die 2  ]      dice >= 72 CSS px (>= 64 at the smallest sizes)
[ lock 0  ] [ lock 1  ] [ lock 2  ]      padlock buttons, each >= 44x44, directly under its die
[ Reroll (n) ] [ Undo ] [ End Turn + forecast ]
```

### Tapping a die (always "use")

- `targets.length === 0` and usable (no-target dice: Focus, Cleave, self-only): **one tap uses it.**
- exactly one target: **one tap uses it on that target.**
- several targets: the die **lifts** (selected). Valid targets glow and each shows the exact
  preview chip from `engine.previewDie`. Tap a target to use it. Tap the die again, tap
  empty space, or tap another die to put it down (tapping another die applies that die's
  own rule).
- a pure blank (effect `blank` after all modifiers): never dispatches. The die gives a small
  shake and the hint line says "Blank: nothing to use". (A blank that acts as something
  through an item is a normal die.)
- an unusable die (used, hero down): small shake, hint says why (`engine.whyIllegal`).
- Setting "Always choose the target myself" (default off): when on, single-target dice also
  lift and wait for the target tap.

### Padlocks (keep a die through a reroll)

- A padlock button under each die: open = will be rerolled, closed = kept. Tap toggles
  (`toggleLock`). The die it belongs to shows the `die.locked` look while kept.
- Padlocks are only meaningful while a reroll is still possible. They are shown enabled
  when `phase === 'rolling'` and a reroll could happen (`rerollsLeft > 0` or a free reroll
  is available); otherwise they are hidden (fade out), not merely disabled.
- A die jammed by an enemy shows a chain in place of the padlock; tapping it shakes and
  explains ("Jammed by <enemy>: cannot be rerolled this turn").
- If any held item cares about the first die locked, the first-locked die gets a small "1st"
  marker on its padlock.

### Reroll, Undo, End Turn

- Reroll button label: "Reroll" + remaining count as pips or a number. Disabled states use
  `engine.whyIllegal` for the hint ("Every die is locked", "No rerolls left").
- Using the first die ends rolling (engine rule, unchanged). The moment that happens with
  rerolls still unspent: the Reroll button closes with a short "shutter" animation and
  reads "Rolling over", padlocks fade out, and the hint line reads "Changed your mind?
  Undo brings your rerolls back." Undo restores everything exactly (engine already does).
- Undo: one step per tap, back to the start of the acting phase / rolling state. Disabled
  when there is nothing to undo.
- End Turn keeps the exact forecast and the downed / party-wipe confirmation. If dice are
  still unused it says so in the confirmation ("2 dice unused").

### Seeing before committing

- The die face always shows the real current effect icon, value and keyword badges
  (`engine.dice`), updated live as sets and bonuses change.
- While exactly one enemy (or one valid hero) is the only target for a die, nothing extra is
  shown by default (the die's own number is the information); a **long-press (350 ms) on a
  die "peeks"**: shows previews on its targets and opens the die info sheet without using it.
- Set preview (pair / triple / rainbow that the showing dice would form) stays visible in
  the tray while rolling (`engine.previewSets`).

### Animation (CSS transforms / Web Animations only; no idle loops)

| moment | motion | reduce-motion |
|---|---|---|
| roll / reroll | unlocked dice tumble and flip through faces, staggered, then land with a small bounce | faces swap with a 120 ms fade |
| lock | padlock shackle snaps shut, die sinks 2 px and gains the locked rim | instant state change |
| lift (multi-target) | die rises ~10 px with a soft shadow; targets pulse twice then hold a steady glow | steady highlight only |
| use | die hops, flies on an arc to the target (a small "ghost" of the die; the real die stays in its slot), impact flash on the target, number pops, HP bar moves when it lands; the die in the slot turns to the used look | target flashes, number appears |
| no-target use | die hops in place, effect burst over the party or enemy row | brief highlight |
| set formed | a ribbon links the matching dice and the set name pops once | banner text appears |
| rolling over | Reroll button shutters closed | label changes |
| undo | everything snaps back with a quick reverse hop | instant |

Total time from tap to "next tap accepted" must stay under 450 ms for a single die use
(under 150 ms with reduce motion); inputs during an animation are queued, not dropped.

### Tap budget (tested)

- Three dice, each with one possible target: 3 taps + End Turn.
- Keep two dice and reroll once: 3 taps (lock, lock, Reroll).
- Multi-target die: 2 taps.

### Tutorial (rewritten, 5 short steps, each waits for the action; skippable; replayable)

1. "Enemies show what they will do" (tap an intent). 2. "Tap the padlock under a die to keep
it" 3. "Reroll the rest" 4. "Tap a die to use it" (one single-target die, then a
multi-target die: "tap who to hit") 5. "End Turn shows the damage coming".

### Test ids (ui keeps `src/ui/TESTING.md` exact; qa depends on it)

`die-<i>`, `lock-<i>` (attribute `data-locked="true|false"`, `data-jammed`), `btn-reroll`
(`data-rerolls`), `btn-undo`, `btn-end-turn`, `hint-line`, existing ids for heroes, enemies,
intents, previews. `btn-use-dice`, `btn-back-to-lock` and the mode pill must not exist.
`window.__pip` keeps its contract, including `waitIdle()`.

## C. One toy set

### Style rules (art)

Everything is drawn by `tools/voxelgen` and regenerated by `npm run art`.

- **Icons are tiny voxel models**, built from parts like the characters and drawn by the
  same isometric renderer: one fixed angle, exactly three shades per colour (light top,
  medium left, dark right), dark ink outline, shared palette (about 24, hard max 28).
  No base under icons. Categories: `sym`, `fx`, `kw`, `status`, `intent`, `door`, `set`,
  `ui`, `item`, and the `die.*` overlays. Native size 32 to 48 px (items and doors up to
  48; small badges such as `kw.*` and `status.*` must still read when shown at 20 CSS px,
  so keep each to one bold object with at most one accent).
- Icon meaning comes first: a sword is unmistakably a sword at 24 CSS px. Chunky, few
  voxels, strong silhouette, one object per icon wherever possible (reroll = a die with a
  curved arrow; padlock closed / open; undo = a bent arrow block; end turn = an hourglass
  or double chevron blocks).
- **Interface kit** (category `kit`, see list below): toy-like pieces in the same palette
  and three-shade logic, designed to stretch (9-slice) without blurring: flat front face,
  lighter top bevel, darker bottom edge that reads as thickness, 2 px ink outline, corner
  radius drawn in pixels. Pressed state = the piece sunk (thickness removed). Wood, felt
  and card textures are flat colour with at most a sparse 1 px grain: calm, not noisy.
- **Backgrounds** (`bg.*`, 180x320): a tabletop diorama: a clear ground plane the
  miniatures appear to stand on, a simple backdrop per act (forest edge, flooded vault,
  volcanic spire), large flat shapes, almost no dithering, lower 60% calm and darker so
  units, bars and the tray read. `bg.menu` is a game table with felt and a few dice.
- **Dice** (`die.<hero>` + overlays): a larger voxel cube (native about 48 px) with a wide
  clear top/front face for the UI to draw the effect icon and number; hero colour body with
  an ivory face plate. Overlays: locked (gold rim + small padlock), jammed (chain),
  cursed (purple crack), used (flattened / greyed), blank (empty face with slash).
- Characters, enemies and bosses stay as they are unless the lead asks for a fix.
- The gallery shows every sprite including the kit, with kit pieces also shown stretched.

### Manifest contract

`SpriteInfo.render` is set by the generator from the code path really used: `'voxel'` only
when the image was produced by rendering a voxel model through the isometric renderer;
`'kit'` for interface-kit pieces; `'scene'` for backgrounds. `SpriteInfo.slice` holds 9-slice
insets `[top, right, bottom, left]` for stretchable kit pieces. The content check will fail
if any sprite in `sym, fx, kw, status, intent, door, set, ui, item, die, hero, enemy, boss,
app` is not `render: 'voxel'`, if any of those icon categories is under 32 px native, or if
any kit piece that must stretch has no `slice`.

### Interface kit list (ids `kit.<name>`; the lead adds them to `ASSET_LIST` once art's generator supports the category)

| id | what | stretch |
|---|---|---|
| `kit.button` `kit.button_pressed` `kit.button_disabled` | standard chunky button (ivory / wood) | 9-slice |
| `kit.button_primary` `kit.button_primary_pressed` | gold primary button | 9-slice |
| `kit.button_danger` `kit.button_danger_pressed` | red warning button (party wipe, reset) | 9-slice |
| `kit.panel` | card-like light panel (reward cards, list rows) | 9-slice |
| `kit.panel_dark` | dark inset panel (info areas) | 9-slice |
| `kit.panel_selected` | selected / highlighted card frame | 9-slice |
| `kit.sheet` | bottom sheet body with a grab notch | 9-slice |
| `kit.tray` | the dice tray: wooden rim, felt floor | 9-slice |
| `kit.slot` | socket a die sits in | fixed |
| `kit.bubble` | enemy intent bubble with a pointer | 9-slice |
| `kit.chip` | small pill for statuses and previews | 9-slice |
| `kit.badge` | round number badge | fixed |
| `kit.bar_frame` | health bar frame | 9-slice (horizontal) |
| `kit.bar_hp` `kit.bar_hurt` `kit.bar_shield` | bar fills | horizontal tile |
| `kit.tab` `kit.tab_active` | tabs | 9-slice |
| `kit.toggle_off` `kit.toggle_on` | settings switch | fixed |
| `kit.banner` | ribbon for set names, victory, act titles | 9-slice (horizontal) |
| `kit.lock_open` `kit.lock_closed` `kit.lock_chain` | the padlock button under a die (whole button art, 44 px-friendly) | fixed |
| `kit.divider` | thin toy divider line | horizontal tile |

New `ui.*` icons to add (voxel): `ui.install` (share-arrow box), `ui.target` (reticle for
"choose the target myself"), `ui.peek` (eye). Everything already in `ASSET_LIST` is redrawn
in place under the same id.

### Applying the kit (ui)

- All buttons, panels, sheets, chips, bars, tabs, toggles and the tray use kit art via
  `border-image` (9-slice, `image-rendering: pixelated`, integer scale) or backgrounds; no
  CSS-gradient "flat app" surfaces remain. Text is the system rounded face
  (`ui-rounded, "SF Pro Rounded", system-ui`), heavy weights, with the ink colour and a
  1 px hard shadow where it sits on art; never below 12 px.
- Icon sizes: at least 24 CSS px wherever an icon carries meaning alone; on dice the effect
  icon is at least 40% of the die's width.
- Colours used in CSS come only from the manifest palette (export them as CSS variables).
- Every screen restyled: Home, Hero select, Fight, Reward, Doors, Rest, Shop, Event,
  Treasure, Victory, Defeat, Collection, Feats, Stats, Daily, Settings, tutorial card, info
  sheets, rotate overlay, install tip, toasts and confirmations.
- Settings shows "Version 0.2.0" from `__APP_VERSION__` (`data-testid="app-version"`).

## D. What must stay true

- No engine or content changes are expected. Game numbers and balance thresholds are frozen.
- Saves: `SAVE_VERSION` stays 1. `tests/fixtures/save-v0.1.0.json` (made by the 0.1.0 code,
  mid-fight, with history) must load and resume. New settings fields must default safely
  when missing from an old save.
- Offline, no audio, no network, no downloaded art or fonts, portrait, safe areas, 44 px
  targets, thumb-reach controls, no idle animation loop, reduce motion honoured.
- `dist/` and Playwright are shared: only one teammate builds or runs the e2e suite at a
  time; say so in a message to the lead before a long run. The e2e server uses port 47613.

## E. Order of work

1. lead: this document, fixture, version plumbing (done before anyone is spawned).
2. art: **style sheet first** (see BRIEF-2 section 3): a few icons, each button state, a
   panel, the tray, a die in each state, one background, composed into a mock fight screen
   PNG at 390x844 next to real hero and enemy sprites. Stop and send it to the lead.
   ui (in parallel): the scrolling fix and audit, then the new dice flow with current art.
3. lead reviews the style sheet; art then produces everything; lead adds `kit` to the asset
   list and tightens the content check.
4. qa joins when the dice flow is playable: scroll tests, dice-flow tests, old-save test,
   tutorial and full-run updates.
5. ui restyles every screen with the kit; qa recaptures every screen; lead and qa review
   until nothing flat or off-style remains.
6. lead: full `npm run verify`, publish as a clean snapshot, confirm live version 0.2.0.
