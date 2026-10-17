# Progress

If the session restarts: read `BRIEF.md`, `docs/design.md`, this file. The build is complete;
teammates are only needed for fixes (respawn by name with the ownership table in `CLAUDE.md`).

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | Foundation (design doc, shared interfaces, scaffold, CLAUDE.md, asset list, verify wired) | complete |
| 2 | First playable (one full fight, real art, phone-sized, save and resume) | complete |
| 3 | Full game (all systems, content, screens, extras) | complete |
| 4 | Balance and polish (sim tuning, screenshot review, bugs, performance, offline) | complete |
| 5 | Finish (README "Publish and install", everything committed) | complete |

All 5 phases complete. `npm run verify` passes all 7 gates.

## Update 0.2.0 ("one toy set", BRIEF-2.md): complete

| # | Step | Status |
|---|---|---|
| A | Spec (`docs/redesign.md`), 0.1.0 save fixture, version plumbing | complete |
| B | Scrolling fix and audit (ui) | complete |
| C | Tap-to-use dice flow, padlocks, animations, tutorial (ui) | complete |
| D | Art: every icon as a voxel toy, interface kit, pixel font, backgrounds, dice (art) | complete |
| E | Restyle every screen with the kit (ui) | complete |
| F | Tests: finger scrolling, dice flow, old save, tutorial, full run, screenshots (qa) | complete |
| G | Lead screenshot review | complete (see below) |
| H | Full verify, publish clean snapshot, confirm live 0.2.0 | complete |

Team used: art (Opus), ui (Opus, replaced once by a fresh ui teammate when the first ran
out of room), qa (Sonnet). Never more than 3 at once. engine and designer were not needed:
no game rule or number changed. All teammates are shut down.

### Lead's screenshot review (11 Oct 2026)

I reviewed the committed screenshots in `tests/e2e/screenshots/390x664/` (the owner's
Safari-tab size) and `390x844/` (installed size): Home, Hero select, Fight (rolling, a die
lifted with targets and previews, rolling over, blank, cursed and jammed dice, four enemies,
each act's boss), Reward, the replace-a-face sheet, Shop, Collection, Settings and Victory,
plus the art review sheets in `tools/voxelgen/stylesheet/`.

**Nothing flat or off-style remains.** Every icon is a voxel toy object drawn by the same
renderer as the characters (the content check counts 0 flat in every icon category and
fails the build if one returns). Every button, panel, sheet, chip, bar, tab and the dice
tray is an interface-kit piece. Titles, button labels and numbers use the code-generated
pixel font; longer descriptions use the phone's own font so they stay easy to read, which
is a deliberate choice, not a leftover. Backgrounds are tabletop dioramas.

**Published 11 Oct 2026.** `npm run verify` passed all 7 gates (830 Playwright tests) on
the final code. The update was uploaded as a clean copy authored by `harborpine`, the
GitHub build succeeded, and https://harborpine.github.io/pip-and-blade/version.json reports
0.2.0. Next: the owner checks 0.2.0 on their own iPhone (see README, "Needs Harborpine").

Known soft spots, accepted:

- On the smallest phone size (375x548) the layout is dense: enemy intentions shrink to an
  icon and a number, and the tutorial's first fight overlaps by about 10 px.
- The shop list scrolls in a Safari tab (full item text is kept); scrolling there works.
- A few small icons are weaker than the rest (the undo "rewind" arrows, the weakened sword).
- A physical iPhone cannot be tested from this PC. True native finger scrolling is proven
  in Chromium's engine and, in Safari's engine, by proving the game no longer cancels the
  drag. The owner's phone is the final check.

## Update 0.3.0 ("clean and flat", BRIEF-3.md): in progress

| # | Step | Status |
|---|---|---|
| A | Spec (`docs/flat-style.md`), 0.2.0 save fixture (`tests/fixtures/save-v0.2.0.json`) | done |
| B | Art style sheet (dice, icons, six tokens, backdrop, mock fight screen) | done |
| C | Lead review of the style sheet; mock sent to the owner | done (approved with fixes) |
| D | Full art set as flat SVG (art) | done (169 SVGs) |
| E | Cut-over: asset list, content check, art script, SVGs and CSS surfaces (lead, art, ui) | done |
| F | Every screen restyled (ui) | done |
| G | Tests kept green, look checks replaced, old-save tests, screenshots (qa) | done (891 tests) |
| H | Lead screenshot review | done (see below) |
| I | Full verify, publish clean snapshot, confirm live 0.3.0, before/after to owner | not started |

### Lead's screenshot review for 0.3.0 (17 Oct 2026)

I reviewed the committed screenshots in `tests/e2e/screenshots/390x664/` and `390x844/`
plus ui3's review set: Home, Hero select, Fight (rolling, a die lifted with targets, a
jammed die, four enemies, the Act 2 boss), Reward, Shop, Collection, Victory, and the art
review sheets in `tools/artgen/stylesheet/`.

**Nothing from the old look remains and nothing looks cluttered.** Every picture is a flat
vector drawing (the content check counts 169 of 169 and 0 leftovers); the dice are flat,
front-on and ivory with a large icon and a real-text number; every character is a round
token; every surface is drawn by the app; all text uses the rounded system lettering. The
new `look.spec.ts` (58 tests) enforces all of this on every run.

Known soft spots, accepted: the "Rolling over" button is low contrast (it is a disabled
state with its words also in the hint line); a shield badge can touch a token's edge; a few
pictures are weaker than the rest (the reduce-motion feather, the boss marker, the glove
and bandana items, the anchor-less Anchor Hulk, the dark Slag Golem); this PC has no Apple
rounded font, so the real lettering is seen only on the owner's iPhone.

If the session restarts: read BRIEF-3.md, docs/flat-style.md and this table; respawn the
teammates the table needs (art, ui, qa) with a written handover; carry on.

## Who owns what

See the table in `CLAUDE.md`. Team mode used: real named teammates (engine, art, ui,
designer, qa), never more than 3 working at once. All teammates are shut down.

## Active now

- 0.3.0 in progress (see the table above). Version 0.2.0 is live.

## Done

- **lead**: design doc, shared contract (`src/shared/`), fixed roster and 177-sprite asset
  list, scaffold, CLAUDE.md, verify pipeline, content check, deploy workflow, README,
  reviews of art, screens, engine interpretations and balance.
- **engine**: full `Engine` interface: fights, sets, 12 keywords, items, enemy AI and tricks,
  run structure, feats, tiers, daily, tutorial, versioned saves, Fury anti-stall rule.
  Unit tests include deep fuzz (previews and forecasts exact, save round-trip, determinism).
- **art**: voxel generator (`npm run art`), 177 sprites, app icons, gallery, two polish passes.
- **designer**: 8 heroes, 25 enemies, 3 bosses, 40 items, 12 keywords, 13 events, 20 feats,
  5 tiers; careless and skilled bots; 8 strategies; balance gate of 13 lines over 59,216
  seeded runs (skilled 24.1%, careless clears Act 1 84.8%, strategies 21.6% to 27.1%,
  strongest hero trio 36.3%).
- **ui**: every screen, tap-tap input, animation, tutorial, collection, stats, daily,
  settings, save backup, storage, PWA shell.
- **qa**: 189 Playwright tests in WebKit at iPhone size: tutorial, full winning run, losing
  run, mid-fight resume, export/import, daily twice, offline, layout on 53 scenes at 3
  sizes, fairness, Fury, dice tricks, settings, idle check. Screenshots in
  `tests/e2e/screenshots/`.

## Next (only if the owner asks)

- Carry out `BRIEF-2.md` when the owner sends its goal.
- Known soft spots: boss fights are small on the smallest iPhones (375x667); the pinned
  winning seed in `tests/e2e/pinned.ts` must be re-pinned after any balance change.

## Notes for respawning teammates

- Node is not on PATH; see CLAUDE.md "Running commands".
- Each teammate reads BRIEF.md, docs/design.md, CLAUDE.md and `src/shared/` before starting.
- `dist/` is shared: only one teammate may build or run Playwright at a time.
