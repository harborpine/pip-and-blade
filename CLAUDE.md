# Pip & Blade: rules for everyone working in this repo

A single-player dice-builder roguelike PWA for iPhone. Read these first, in this order:

1. `BRIEF.md`: what the owner (Harborpine, a non-programmer) asked for. It is the requirement.
2. `docs/design.md`: the specification. `src/shared/` is the binding contract (types).
3. `docs/PROGRESS.md`: current phase, who owns what, what is next.
4. `BRIEF-2.md` and `docs/redesign.md`: the 0.2.0 update (scrolling and the dice flow
   still follow `docs/redesign.md` sections A and B).
5. For the 0.3.0 update: `BRIEF-3.md` (the owner's third brief) and `docs/flat-style.md`
   (its exact specification). Game rules, numbers, interaction and test ids are frozen.

## Team and ownership

| Name | Owns (may edit) |
|---|---|
| lead | `docs/`, `CLAUDE.md`, `README.md`, `BRIEF*.md`, `package.json`, config files in the repo root, `scripts/`, `tools/check-content.ts`, `tests/fixtures/`, `.github/`, `src/shared/` |
| engine | `src/engine/` |
| designer | `src/content/`, `tools/sim/` |
| art | `tools/artgen/`, `src/art/`, `public/art/`, `public/icons/`, `public/gallery.html` |
| ui | `src/ui/`, `index.html`, `public/` (everything except art's three paths) |
| qa | `tests/e2e/` |

## Rules (not negotiable)

- **Only edit files in folders you own.** Need a change elsewhere? Message the owner by name
  with the exact change and why. Changes to `src/shared/` go through the lead.
- **Commit small and often** with clear messages. Never leave `main` broken: before each
  commit run the type check and the unit tests (commands below).
  Commit only your own folders: `git add <your folders>` then `git commit`. Never `git add -A`,
  never `git commit -a`, never amend, rebase, reset, stash, or force anything: other
  teammates are committing to the same working tree at the same time. If `git commit` fails
  because of a lock, wait a few seconds and retry.
- **Never weaken, skip or delete a test or a balance threshold to get a pass.** Fix the cause.
  If you believe a test or threshold is wrong, tell the lead; do not change it yourself.
- No audio. No network calls at runtime. No accounts, analytics, ads or paid services.
  No downloaded or hand-drawn art; no AI image services. No native dependencies.
- Do not add npm dependencies yourself: ask the lead (the lead owns `package.json`).
- Do not create a GitHub repo, push, or deploy.
- Everything original: no names, numbers, text or art taken from other games.
- All content and balance numbers live in `src/content/`, never in engine or UI code.
- The engine is pure and deterministic: no DOM, no `Date`, no `Math.random` (lint enforces it).
- When you finish a piece of work or are blocked, message the lead with: what is done, what
  is not, how you verified it, and anything another teammate needs to know.
- Report honestly. If something fails or was not tested, say so.

## Running commands on this machine (Windows)

Node.js is installed but **not on PATH**. Prefix every session with one of these:

PowerShell:
```
$env:Path = "$env:LOCALAPPDATA\Programs\node-v24.21.0-win-x64;$env:Path"
```
Bash (Git Bash):
```
export PATH="/c/Users/$USERNAME/AppData/Local/Programs/node-v24.21.0-win-x64:$PATH"
```

The project path contains a space and an ampersand (`Pip & Blade`): always quote paths.

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript type check of everything |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm test` | Vitest unit tests (`src/**/*.test.ts`, `tools/**/*.test.ts`) |
| `npm run check:content` | counts, art present, no missing references |
| `npm run sim` | balance simulation with thresholds (`npm run sim -- --quick` for a fast, non-gating look) |
| `npm run art` | regenerate every graphic |
| `npm run dev` | dev server at http://localhost:5173/pip-and-blade/ |
| `npm run build` | production build into `dist/` |
| `npm run e2e` | Playwright, WebKit at iPhone size, against the built app |
| `npm run verify` | all of the above gates in order: the single source of truth for "done" |

Long-running commands (dev server, sim) must not be left running when you finish.

`dist/` and the Playwright run are shared by everyone: only one teammate may run
`npm run build` or the e2e suite at a time. Tell the lead before a long run, and pass
`--output <your scratch folder>` to Playwright so runs do not wipe each other's results.
The e2e preview server uses port 47613 (another project on this PC uses 4173).
`tests/fixtures/` (lead-owned) holds save files made by released versions.

## Code conventions

- TypeScript strict. Import across layers with the aliases `@shared`, `@engine`, `@content`,
  `@art`, `@ui/*`. Use `import type` for types.
- Layering: `engine` imports only `@shared`. `content` imports only `@shared`. `ui` may import
  everything. Nothing imports `ui`. Lint enforces this.
- State is plain JSON. `engine.apply` never mutates its input.
- Unit tests sit beside the code as `*.test.ts`.
- No `any` unless unavoidable and commented. No default exports except config files.
