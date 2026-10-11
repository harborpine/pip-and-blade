# Pip & Blade

A single-player dice-builder roguelike for your iPhone. Three toy-miniature heroes, one die
each. Roll, lock, reroll, then spend each die. Runs take about 15 minutes. It works offline,
has no sound, no accounts, no ads, and costs nothing to host.

## Needs Harborpine

Nothing is waiting on you right now.

- **Published:** done on 11 Oct 2026. The game is live at
  https://harborpine.github.io/pip-and-blade/
- **Tried on a real iPhone:** version 0.1.0 was tried by the owner on 11 Oct 2026, in a
  Safari browser tab. It found three things the PC tests missed. Version 0.2.0 fixes them:
  the "replace a face" sheet that could not be scrolled, icons and interface that did not
  match the character art, and a clumsy lock-then-use dice flow.
- **Please check 0.2.0 on your phone.** Open the game with a signal, then close and reopen
  it once. Settings should say "Version 0.2.0". Try the replace-a-face sheet (pick a "new
  face" reward) and the new dice: tap a die to use it, tap the padlock under a die to keep it.
- **After each update:** only you can confirm it on the real phone, because a physical iPhone
  cannot be tested from this PC.

## Publish and install

You do this once. After that, any future change is published by the same "push" step.

### Part 1: put the project on GitHub (on this PC)

1. Go to https://github.com and sign in (or create a free account).
2. Click the **+** at the top right, then **New repository**.
3. Repository name: type exactly `pip-and-blade` (the game is built to live at that address).
4. Choose **Public** (free hosting needs a public repository). Leave every checkbox empty.
   Click **Create repository**.
5. Ask Claude Code, in this project: "Push Pip & Blade to my new GitHub repository
   `pip-and-blade`." It will run the commands with you. GitHub will ask you to sign in in a
   browser window the first time.

### Part 2: switch on the free hosting

1. On the repository page on GitHub, click **Settings**, then **Pages** in the left menu.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**. That is all.
3. Click the **Actions** tab. A job called "Deploy to GitHub Pages" will be running. Wait for
   the green tick (about 2 minutes). If it shows a red cross, re-run it once; if it fails
   again, tell Claude Code what it says.
4. Your game is now at: `https://harborpine.github.io/pip-and-blade/`

### Part 3: install it on your iPhone

1. On the iPhone, open **Safari** (it must be Safari) and go to the address above.
2. Wait a few seconds on the title screen so it can save itself for offline play.
3. Tap the **Share** button (the square with an arrow), scroll down, tap
   **Add to Home Screen**, then **Add**.
4. Open "Pip & Blade" from your home screen. It runs full screen, in portrait, and works
   with no signal.

### Good to know

- **Your progress lives on the phone**, inside the installed app. Deleting the app icon, or
  clearing Safari's website data, deletes it. Use **Settings > Export save** in the game now
  and then to keep a backup file, and **Import save** to restore it.
- **Updates**: when a new version is pushed to GitHub, the game updates itself the next time
  you open it with a signal (you may need to close and reopen it once).
- The address is public, but there is nothing private in it: no accounts, no data leaves
  your phone.
- The art gallery (every character and icon with its name) is at the same address plus
  `gallery.html`.

## How to play (short version)

- Pick 3 heroes. Each has one six-sided die; its faces are that hero's actions.
- Enemies always show exactly what they will do next.
- Each turn your dice roll. Tap the **padlock under a die** to keep it, then tap **Reroll**
  (2 per turn) to reroll the rest.
- **Tap a die to use it.** If it could hit more than one target, tap who to hit.
  **Undo** works until you press **End Turn**, and gives your rerolls back.
- Hold a finger on a die to see exactly what it would do, without using it.
- The End Turn button tells you exactly how much damage is coming.
- Matching symbols across your dice make a pair or a triple for bonus effects.
- After each fight pick 1 of 3 rewards: a new face, an upgrade, or an item. Then choose a door.
- 3 acts, each 3 fights and a boss. Heroes and items unlock by doing feats, never by grinding.

## For whoever maintains this

Read `CLAUDE.md` first (team rules and how to run things on this PC: Node.js is installed
but not on PATH), then `docs/design.md`, `docs/DECISIONS.md` and `docs/PROGRESS.md`.

| Command | What it does |
|---|---|
| `npm run verify` | Every check in order: types, lint, unit tests, content check, balance simulation, build, phone tests. This is the definition of "done". |
| `npm run dev` | Run the game locally at http://localhost:5173/pip-and-blade/ |
| `npm run art` | Regenerate every graphic from code |
| `npm run sim` | Balance simulation (thousands of seeded runs per bot) |

Limitations and risks:

- Automated tests run on this PC in Safari's engine at iPhone size. A physical iPhone cannot
  be tested from here; the owner checks each version on their own phone.
- This folder is inside OneDrive, which also syncs the large `node_modules` working folder.
  If you see file-locking errors while building, pause OneDrive syncing and try again.
- On the smallest iPhones (the 375-wide size, such as an iPhone SE) boss fights draw the
  characters small. Everything is readable and tappable, but it is tighter than on a current iPhone.
- Balance was tuned against two robot players, not people. Real play may feel easier or
  harder; all numbers are in `src/content/` and the simulation will say if a change breaks
  the difficulty targets.
- The phone tests replay one pre-planned winning game. If game numbers change, that plan must
  be re-made (`tests/e2e/support/find-seed.ts`); the test says so when it fails.
