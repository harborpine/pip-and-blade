Save this entire message, word for word, as BRIEF.md in the project root. Then reply "Brief saved" and stop. Do not start building yet; I'll start the build with a /goal next.

# Pip & Blade: build brief

## What I want
A complete, polished, single-player dice-builder roguelike called "Pip & Blade" that I play in portrait on my iPhone in spare moments. I'm not a programmer. I want this built start to finish without my involvement: make every design and technical decision yourself, record the big ones in docs/DECISIONS.md, and don't stop to ask me questions.

It must be original. It's in the same genre as games like Slice & Dice, but every name, number, piece of art and line of text is your own.

## Platform (all free, no App Store, no Apple developer account)
- An installable web app (PWA) I add to my iPhone home screen from Safari. Full screen, portrait, works fully offline after first load, saves on the phone.
- Hosted free on GitHub Pages. Set up the build to work from a /pip-and-blade/ subpath and add a GitHub Actions workflow that deploys on push to main. Do NOT create the GitHub repo, push, or publish yourself: finish with a "Publish and install" section in README.md and I'll do that step with you afterwards.
- I build on Windows. Everything runs with npm scripts; no native dependencies that need compilers.
- iPhone details that must be right: safe-area insets (notch and home bar), no page scroll, bounce, zoom or text selection during play, tap targets at least 44px, main controls within one-thumb reach in the lower half of the screen, a "rotate back to portrait" overlay in landscape, apple-touch-icon and theme colors, 60fps on a recent iPhone, light on battery when idle.
- No audio of any kind. No accounts, servers, ads, analytics or paid services.

## Tech
- TypeScript + Vite. Lightweight rendering (DOM/CSS for interface, canvas for sprites); no heavy game engine unless you have a strong reason.
- A rules engine in pure TypeScript with no browser dependencies, fully deterministic from a seed, so it runs headless in tests and simulations.
- All content and balance numbers live in data files, not in engine code.
- Saves: write after every player action so I can close the app mid-fight and resume exactly. Versioned save format with migrations. Request persistent storage from the browser.

## The game
Run: I pick 3 heroes from those I've unlocked. A run is 3 acts; each act is 3 fights and a boss, with a choice of two doors between fights (for example: harder fight for better loot, rest, shop, random event). A full winning run takes about 15 minutes; losing runs end sooner.

Turn: enemies show exactly what they'll do next. All my living heroes' dice roll. I tap dice to lock them and reroll the rest, up to 2 rerolls. Then I tap a die and tap a target to use it (tap-tap, not drag). I can undo until I end the turn. Then enemies act.

Heroes: each hero has HP, one six-sided die whose faces are that hero's actions, and item slots. A hero at 0 HP is out for that fight (their die is gone) and returns at partial HP next fight. The run ends when all three are down.

Builds (the heart of the game; replay value comes from combinations):
- After each fight, pick 1 of 3 rewards: replace a die face, upgrade a face, or take an item.
- Face keywords such as Cleave (hits all enemies), Echo (copies the neighboring die), Growth (+1 each use this fight), Reckless (big hit, hurts the user). Design about 12.
- Sets: matching symbols across my dice trigger bonuses, so locking and rerolling has a poker-like feel.
- Rule-bending items, e.g. "blank faces deal 2 damage", "rerolled dice get +1", "the first die you lock is doubled".
- There must be at least 6 clearly different winning strategies, and simulation must show none of them dominating.

Enemies: telegraphed intents, and some interfere with dice (lock a die, curse a face to blank, steal a reroll). Each boss has a distinct mechanic.

Content at launch: 8 heroes (3 available at the start, 5 unlockable), 25 enemies, 3 bosses, 40 items, about 12 keywords, about 10 events, 20 feats.

Difficulty: tough but fair. New players should usually reach Act 2 and lose; a skilled player wins roughly 1 run in 4 on base difficulty. Losses should feel like my mistake, not bad luck: no unavoidable deaths, and always show enemy intents and exact damage previews. After the first win, 5 optional harder tiers unlock, each adding one enemy trick.

Unlocks: heroes and extra items unlock through feats (e.g. "beat a boss without rerolling", "win with a hero at 1 HP"), never through a currency I grind.

Also include:
- Tutorial: a short guided first fight teaching roll, lock, reroll, target and intents. Skippable, replayable from settings.
- Collection and stats: every hero, item and enemy I've seen; win rate, best streak, feats done.
- Daily run: one seeded run per calendar day with fixed heroes, enemies and rewards, identical on every retry; track my best result per day. Local only.
- Save backup: export all progress to a file and import it back, from settings.
- Settings: reduce motion, reset progress (with confirmation), replay tutorial.

## Art: code-generated voxel "toy miniatures"
- Build a voxel art generator in code (tools/voxelgen). No downloaded or hand-drawn assets and no AI image services. One command regenerates every graphic.
- Models are assembled from reusable parts (heads, bodies, weapons, props) plus color sets, so new characters are new combinations.
- Style rules: chunky, 8 to 16 voxels tall, big heads, flat bright colors from one shared limited palette (about 24 colors). Drawn from one fixed isometric angle with exactly three shades per color (light top, medium left, dark right). Every character stands on a miniature base like a board game piece: round for heroes, dark for enemies, larger for bosses. Silhouettes must be readable at about 64px on a phone.
- Dice are voxel cubes whose faces carry clear pixel icons. Generate the UI icons, a background for each of the 3 acts, and the app icon in the same style.
- Motion is simple, not 3D: sprites slide, hop, shake and flash; damage numbers pop; dice flip through faces before landing. Honor reduce-motion.
- Produce a gallery page showing every sprite with its name so the art can be reviewed at a glance.

## Agent team
Agent teams are enabled in my settings. Create an agent team (real teammates, not plain subagents). I'm on the Max 5x plan, so keep at most 3 teammates working at the same time and shut teammates down when their work is done. You are the lead, on Opus. If teammates can't be spawned, use subagents with the same ownership and note it in docs/PROGRESS.md.

Lead (you): owns docs/, CLAUDE.md, package.json, build and deploy config, and src/shared/ (the types and interfaces every teammate builds against). Write the design doc and shared interfaces BEFORE spawning anyone. Coordinate, review and integrate; wait for teammates rather than doing their work.

Teammates (use these names):
- engine (Opus): owns src/engine/. Combat, dice, keywords, sets, run structure, rewards, feats, daily seed, save format. Writes unit tests beside its code.
- designer (Opus): owns src/content/ and tools/sim/. Authors all heroes, enemies, bosses, items, events and feats as data, builds two simulation bots (a careless one and a skilled one), and tunes numbers until the difficulty and build-variety targets hold.
- art (Sonnet): owns tools/voxelgen/, src/art/ and generated assets. Delivers every sprite on the asset list plus the gallery.
- ui (Sonnet): owns src/ui/, index.html, styles and the PWA shell (manifest, service worker, icons). All screens, input, animation, tutorial, collection, settings, save backup.
- qa (Sonnet): owns tests/e2e/. Playwright tests in an iPhone-sized WebKit viewport, screenshot review of every screen, bug reports sent to the owning teammate. Never edits other folders.

Suggested staffing: start engine, art and ui for the first playable; bring in designer once the engine can run a headless fight; swap art out for qa once the asset list is delivered. Adjust if you see a better split.

Rules for everyone (put these in CLAUDE.md so each teammate loads them):
- Only edit files in folders you own. Need a change elsewhere? Message the owner. Changes to src/shared/ go through the lead.
- Each teammate's spawn prompt must contain everything it needs, since it can't see this conversation: point it to BRIEF.md, docs/design.md and its folders.
- Commit small and often with clear messages. Never leave main broken.
- Never weaken, skip or delete a test or a balance threshold to get a pass. Fix the cause.

## Process
1. Foundation (lead alone): docs/design.md, shared interfaces, project scaffold, CLAUDE.md, the full asset list, and `npm run verify` wired up (it will fail at first).
2. First playable: one full fight with 3 heroes and real generated art, playable in a phone-sized browser, saving and resuming.
3. Full game: all systems, all content, all screens, all extras.
4. Balance and polish: simulation tuning, screenshot review of every screen at iPhone size, bug fixing, performance, offline check.
5. Finish: README.md with plain-English "Publish and install" steps, everything committed.

Keep docs/PROGRESS.md current (phase, what's done, what's next, who owns what). If the session restarts or teammates are lost, read BRIEF.md and docs/PROGRESS.md, respawn the teammates you need, and carry on.

`npm run verify` is the single source of truth for "done". It must run: type check; lint; unit tests; a content check (the counts above, every entity has art, no missing references); the balance simulation (at least 2,000 seeded runs per bot); the production build; and the Playwright suite.

If something truly needs me (for example a login), finish everything else and list it at the top of README.md under "Needs Harborpine".
