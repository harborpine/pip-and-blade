# Pip & Blade: update brief 2 ("one toy set")

Read `BRIEF.md` (the original brief; everything in it still applies), `CLAUDE.md`,
`docs/design.md`, `docs/DECISIONS.md` and `docs/PROGRESS.md` first. This brief adds to them.
Where this brief and the original disagree, this one wins.

## Why

The owner has played the live game on their iPhone (a standard / Pro size model), **in a
Safari browser tab, not installed to the home screen**. In a tab the address bar and toolbar
take a lot of height, so the game has far less room than when installed. They love the
characters. Three things let the game down:

1. **A screen that cannot be scrolled.** On the "replace a face" sheet the bottom is cut off
   and a finger cannot scroll to it. It passed the tests, so the tests missed something real.
2. **The icons and interface do not match the characters.** The attack and reroll icons look
   rough, and the icons, buttons and panels are flat while the characters are charming 3D
   toy miniatures. The whole game should look like it came out of the same toy box.
3. **Locking and then using dice is awkward.** Too many presses, and it is not obvious how.
   There is a "lock mode" and a "use mode" and a button to switch between them.

Make every design decision yourself, record the big ones in `docs/DECISIONS.md`, and do not
stop to ask questions. The owner is not a programmer.

## 1. Fix scrolling for real

- Find the real cause in an ordinary iOS Safari tab (where the owner hit it), not just a
  patch for this one sheet. Likely suspects: a sheet taller than the short space a browser
  tab leaves, a global touch handler that blocks finger scrolling, `touch-action`,
  `overflow` or `overscroll` rules, or sizing that ignores Safari's moving toolbars.
- The game must be fully playable both ways: in a Safari tab (short screen, toolbars that
  appear and hide) and installed to the home screen (full height). On first launch in a
  tab, show a small, dismissible tip that installing to the home screen gives more room,
  with the three steps; never nag after it is dismissed.
- Rule from now on: the page itself never scrolls or bounces, but **any list or sheet whose
  content can be taller than its space must scroll with a finger inside itself**, with a
  visible hint that there is more (a fade or a scroll bar). Prefer layouts that fit without
  scrolling; scroll only when content truly cannot fit.
- Audit every sheet and list: replace a face, upgrade a face, reward, shop, rest, event,
  hero / enemy / boss / item / die info sheets, collection, feats, stats, daily history,
  settings, victory, defeat.
- Test it the way a finger does it: real touch-drag gestures in WebKit, at the sizes of the
  owner's phone class both in a Safari tab (about 390x664, 393x659 and 402x681) and in
  home-screen mode (390x844, 393x852 and 402x874), plus the small sizes already covered. A test must fail if the last item in any sheet cannot be brought
  fully into view and tapped.

## 2. Dice: tap to use, a small lock under each die

No modes. No "Use dice" button. No "Lock" button.

- **Tapping a die always means "use it".**
  - If it has exactly one possible target (or needs none), one tap uses it immediately.
  - If it has several possible targets, the die lifts, the valid targets glow and each shows
    its exact preview; tap a target to use it. Tapping the die again, or empty space, puts it
    back down.
- **Each die has its own small padlock directly underneath it** (tap target at least 44px).
  Tap it to keep that die through a reroll; tap again to release. A die jammed by an enemy
  shows a chain instead and cannot be changed. If an item cares which die was locked first,
  mark that die.
- **Reroll** stays as one button showing how many rerolls are left. It rerolls every die
  that is not locked or jammed.
- Using the first die ends the rolling part of the turn (this is the existing rule). Make
  that obvious and painless: the Reroll button visibly closes and says why, the padlocks
  fade away, and **Undo** brings everything back exactly, including the rerolls.
- Because one tap can now commit, the player must be able to see what a die will do before
  tapping: the die face always shows its real current value and effect, a lone target shows
  the exact preview while it is the only choice, and a long-press on a die shows its full
  effect without using it. Exact previews and the End Turn damage forecast stay.
- **Animation makes it readable** (simple, not 3D, and all replaced by quick fades under
  reduce motion): the padlock snaps shut and the die settles; unlocked dice tumble and flip
  through faces on reroll; a used die hops, flies in an arc to its target, lands with a
  flash and a number pop, then returns to its place greyed; a pair or triple gets a short
  flourish linking the matching dice. No animation loop while idle.
- Count the taps: a turn where three dice each have one target must take three taps plus
  End Turn. Keeping two dice and rerolling once must take three taps.
- Rewrite the tutorial for the new flow. Keep it short, skippable and replayable.
- The rules engine should not need to change. If it truly must, the change goes through the
  lead and the `engine` owner, with tests, and saved games must keep working.

## 3. One toy set: art and interface

The characters are the standard. Everything else rises to meet them.

- **Every icon becomes a tiny 3D toy object** made by the voxel generator in the same style
  as the characters: same fixed angle, three shades per colour, dark outline, shared
  palette. A toy sword, toy shield, toy heart, a toy die with an arrow, a toy padlock, a toy
  coin stack. This covers symbols, face effects, keywords, statuses, enemy intents, doors,
  set badges, all interface icons, and item icons. Draw them larger than today (about 32 to
  48 pixels native) so they are bold and readable on a die and in a button. No flat icons
  remain anywhere.
- **Interface kit, also generated by code**: chunky toy buttons (normal, pressed, disabled,
  primary, danger), panels and sheets that look like game cards or wooden trays, a felt or
  wood dice tray, health bars and shield chips that look like toy parts, tabs, toggles,
  frames that stretch cleanly to any size. One command still regenerates every graphic.
- **Backgrounds** redone so they read as a tabletop diorama behind the miniatures, calmer
  and less speckled than today, one per act plus the menu.
- **Dice** are the star of the screen: bigger, clearer faces with the toy icon and a
  high-contrast number, and clear looks for locked, jammed, cursed, blank and used.
- **Text**: no downloaded fonts. Use the phone's rounded system font with chunky styling;
  numbers on dice and damage pops may be code-generated block digits.
- Keep the palette rule (about 24 shared colours), the readable-at-64px rule and the gallery
  page. Update the asset list first (`src/shared/assets.ts`, owned by the lead) and have the
  content check prove that no flat icon is left.
- Do not change the eight heroes, the enemies or the bosses except to fix a flaw the lead
  finds. The owner loves them.
- Work in this order so effort is not wasted: the art teammate first makes one **style
  sheet** (a handful of icons, one button in each state, a panel, the dice tray, a die in
  each state, one background) shown together on a mock fight screen. The lead reviews it
  against the characters and only then is the full set produced.

## What must not break

- Everything the original brief required, and every existing test and balance threshold.
  Do not change any game numbers: this update is about feel, look and one bug.
- **The owner's saved progress on their phone must survive the update.** Prove it with a
  test that loads a save made by the version that is live today.
- Works offline, no audio, no network calls, no new paid or online services, no downloaded
  art, portrait only, safe areas, tap targets at least 44px, main controls in thumb reach.
- Leave the separate "what-to-watch" project completely alone.

## Agent team

Create a real agent team as before. At most 3 teammates working at once; shut each down when
its work is done. The lead coordinates, reviews and integrates and does not do teammates' work.
Ownership of folders is unchanged (see `CLAUDE.md`).

- **lead (Opus)**: writes `docs/redesign.md` (the dice flow in exact detail, the toy-set
  style rules, the scrolling rule, the new asset list) BEFORE spawning anyone; updates
  `src/shared/assets.ts`, the content check, `docs/`; reviews the style sheet and every
  screen; runs `npm run verify`; publishes.
- **art (Opus)**: `tools/voxelgen/`, `src/art/`, generated assets. Style sheet first, then
  every icon as a toy object, the interface kit, backgrounds, dice states, gallery. Looks at
  its own output enlarged and at phone size before calling anything done.
- **ui (Opus)**: `src/ui/`, `index.html`, the shell. The scrolling fix and audit, the new
  dice flow and its animations, the tutorial, restyling every screen with the new kit, and
  keeping `src/ui/TESTING.md` exact.
- **qa (Sonnet)**: `tests/e2e/`. Finger-scroll tests for every sheet, tests for the new dice
  flow and tap counts, the old-save test, updated tutorial and full-run tests, fresh
  screenshots of every screen at the owner's phone sizes (Safari tab and home screen), and a picky visual review sent as
  bug reports to the owners. Never edits other folders.
- **engine (Opus)** and **designer (Opus)**: not expected to be needed. Bring one in only
  for a specific change in its folder, then shut it down.

Suggested order: lead alone on `docs/redesign.md` and the asset list; then art (style sheet)
and ui (scrolling fix, then the dice flow using placeholder art) together; qa joins when the
dice flow is playable; full art production after the style sheet is approved; ui restyles
every screen as the kit lands; qa and lead review screenshots until nothing looks out of
place. Keep `docs/PROGRESS.md` current so a restarted session can carry on.

## Publishing (the owner has approved publishing this update automatically)

When `npm run verify` passes and the screenshots have been reviewed:

- Publish exactly as described in the lead's saved memory "publish-as-clean-snapshot":
  never push the local `main` branch; create a clean copy authored by
  `harborpine <225985385+harborpine@users.noreply.github.com>` on top of what is already
  on GitHub and push that to `https://github.com/harborpine/pip-and-blade.git` as `main`.
  Before pushing, search the copy for the owner's real first name, surname and personal email provider:
  there must be none.
- Show a visible version in Settings (this update is version 0.2.0) so it is easy to tell
  which version is on the phone.
- Confirm the build on GitHub succeeded and the live address
  `https://harborpine.github.io/pip-and-blade/` is serving version 0.2.0.
- Send the owner before-and-after screenshots of the fight screen, the reward screen and the
  home screen, and tell them plainly what changed, what could not be tested (a real iPhone
  cannot be tested from this PC), and how to get the update (open the game with a signal,
  then close and reopen it once).
