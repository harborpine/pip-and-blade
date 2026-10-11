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

## Who owns what

See the table in `CLAUDE.md`. Team mode used: real named teammates (engine, art, ui,
designer, qa), never more than 3 working at once. All teammates are shut down.

## Active now

- Nobody. Waiting on the owner for the two items under "Needs Harborpine" in `README.md`
  (publish to GitHub; try it on a real iPhone).

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

- Publish and install (README). Fix anything found on the real phone.
- Known soft spots: boss fights are small on the smallest iPhones (375x667); the pinned
  winning seed in `tests/e2e/pinned.ts` must be re-pinned after any balance change.

## Notes for respawning teammates

- Node is not on PATH; see CLAUDE.md "Running commands".
- Each teammate reads BRIEF.md, docs/design.md, CLAUDE.md and `src/shared/` before starting.
- `dist/` is shared: only one teammate may build or run Playwright at a time.
