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
| H | Full verify, publish clean snapshot, confirm live 0.2.0 | see the end of this section |

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

Known soft spots, accepted:

- On the smallest phone size (375x548) the layout is dense: enemy intentions shrink to an
  icon and a number, and the tutorial's first fight overlaps by about 10 px.
- The shop list scrolls in a Safari tab (full item text is kept); scrolling there works.
- A few small icons are weaker than the rest (the undo "rewind" arrows, the weakened sword).
- A physical iPhone cannot be tested from this PC. True native finger scrolling is proven
  in Chromium's engine and, in Safari's engine, by proving the game no longer cancels the
  drag. The owner's phone is the final check.

## Who owns what

See the table in `CLAUDE.md`. Team mode used: real named teammates (engine, art, ui,
designer, qa), never more than 3 working at once. All teammates are shut down.

## Active now

- Nobody. Version 0.1.0 is published and the owner has played it on their iPhone.
  Their feedback is written up as `BRIEF-2.md` (scrolling fix, tap-to-use dice, toy-set
  restyle). That work starts when the owner sends its goal.

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
