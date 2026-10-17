# Flat style 0.3.0: specification

Read `BRIEF-3.md` first (the owner's words). This file is the exact specification teammates
build against for version 0.3.0. Game rules, numbers, interaction and test ids are frozen:
only the look changes. Where this file and `docs/redesign.md` disagree about the look, this
file wins; `docs/redesign.md` still governs scrolling (section A) and the dice flow (section B).

## 1. Principles

Flat, calm, crisp. Solid fills, rounded corners, no gradients, no shading, no bevels, no
textures, no pixel art, no drop shadows (one exception: a lifted die may have one soft
shadow). Few shapes. One shared palette. Everything is vector (SVG) or drawn by CSS, so it
is sharp at every size and needs no "whole-number scale" rules. When in doubt, remove detail.

## 2. Palette (art exports it; ui uses only these, through CSS variables)

| Role | Name | Hex |
|---|---|---|
| Text, outlines | ink | #1c2430 |
| Secondary text | ink-soft | #55606b |
| Die face, buttons | ivory | #f4ecd8 |
| Pressed / dim ivory | ivory-dim | #e2d6ba |
| Light panels, sheets | paper | #fbf7ec |
| Tray, dark panels | slate | #243640 |
| Raised dark | slate-2 | #304753 |
| Muted on dark | slate-3 | #6b828d |
| Primary accent, kept | gold | #f2c230 |
| Text on gold | gold-ink | #4a3500 |
| Danger, damage, elite | red | #e0483f |
| Healing, HP | green | #3fae5a |
| Shield | blue | #3f8fe0 |
| Curse, weaken | purple | #8a5fd1 |
| Poison | lime | #7fbf3a |

Plus exactly one colour per hero (8), chosen by art, all clearly different from each other
and each with at least 3:1 contrast against ivory (icons sit on ivory in that colour).
Suggested: bulwark blue, duelist red, herbalist green, gambler purple, redhand orange,
automaton teal, grower olive, hexer magenta. Art exports `PALETTE` (name → hex) and
`HERO_COLOR` (hero id → hex) from `@art`, plus `src/art/generated/palette.css` with one CSS
variable per palette entry (`--c-ink`, ... and `--hero-<id>`). Total palette at most 28.

## 3. The die (drawn by ui with HTML/CSS plus icon SVGs; no die picture files)

At its normal size (76 CSS px; never under 64; scale everything proportionally):

```
 ┌──────────────────────┐   rounded square, radius 16, ivory face, 4px rim in the hero colour
 │ [icon 30]    [ 34 ]  │   left: effect icon in the hero colour; right: value, heavy ink
 │                    ◆ │   top-right corner: set symbol mark, 14px, in its symbol colour
 │      [k][k][+1]      │   bottom edge: up to 2 keyword marks (14px, ink-soft), then "+n"
 └──────────────────────┘
        [ padlock ]         separate 44x44 button under the die (see 3.2)
```

- Number: the system rounded font, weight 800, about 0.45 of the die's height, ink.
  The icon and the number are vertically centred on the same line.
- Symbol colours: blade red, guard blue, heart green, spark gold, skull purple.

### 3.1 States (each must be recognisable without colour)

| State | Look |
|---|---|
| normal | as above |
| kept (locked) | 3px gold ring 3px outside the rim; padlock button below shows closed and gold |
| lifted (choosing a target) | raised 8px with one soft shadow; 3px ink ring |
| used | whole die greyed (ivory-dim face, slate-3 rim, icon and number ink-soft at 60%), sunk 2px |
| blank | ivory face, slate-3 rim, a centred grey dash (`fx.blank`), no number |
| cursed | purple-tinted face, purple rim, the `die.cursed` crack mark centred, no number |
| jammed | normal face with the `die.jammed` chain mark across the lower half; padlock replaced by a chain button |
| disabled (hero down) | used look plus a small "down" mark |

### 3.2 Padlock button

44x44 rounded square directly below its die (it may overlap the die's bottom by up to 10px).
Open: slate-2 fill, ivory `ui.unlock` icon. Closed: gold fill, gold-ink `ui.lock` icon.
Jammed: slate-2 fill, `die.jammed` chain icon. First-locked marker: a tiny "1st" badge.

## 4. Characters: round tokens (SVG, one per hero, enemy and boss)

- Each token is a 96x96 SVG: a disc (r 44) with a 6px rim, and inside it (within r 34) a
  simple face or emblem of at most about 12 flat shapes that captures the character
  (use `look` in `src/shared/roster.ts`).
- Hero: ivory disc, rim in the hero colour. Enemy: slate disc, slate-3 rim. Elite enemies
  (`hollow_stag`, `anchor_hulk`, `obsidian_knight`): slate disc, red rim. Boss: slate disc,
  gold rim; ui displays bosses at 1.5x the enemy size.
- All 36 must be distinguishable at 64px by shape, not only colour; check by viewing all
  enemies of one act side by side at 64px.
- A downed hero: ui applies a grey filter and the "down" mark. Hop, shake and flash
  animations work on the token as before.

## 5. Icons

- One family: SVG on a 24x24 grid, solid filled shapes, corners rounded about 2 units,
  optical size consistent (a shield and a sword look equally heavy), filled with
  `currentColor` so ui tints them. One object per icon; meaning first; readable at 20px.
- Categories, same ids as before: `sym.*`, `fx.*`, `kw.*`, `status.*`, `intent.*`,
  `set.*`, `ui.*` (including `ui.install`, `ui.target`, `ui.peek`), `die.jammed`,
  `die.cursed`.
- Items (`item.*`, 40) and doors (`door.*`, 6): 48x48 SVG, may use up to 3 palette colours
  (not `currentColor`), same flat rules; each must read as the named object.
- `ui.logo`: an ivory die and a short sword, flat, about 160x120.

## 6. Surfaces (drawn by ui in CSS; no picture-based frames)

| Element | Style |
|---|---|
| Button | ivory fill, ink text, radius 12, 2px ivory-dim bottom edge; pressed: ivory-dim, edge removed |
| Primary button | gold fill, gold-ink text (one per screen) |
| Danger button | red fill, ivory text |
| Disabled | slate-2 fill, slate-3 text (prefer explaining over disabling, as now) |
| Panel / card | paper fill, radius 14, 1px ivory-dim border |
| Dark panel | slate-2 fill, radius 14 |
| Sheet | paper fill, top radius 20, a small slate-3 grip bar |
| Dice tray | slate fill, radius 18, no rim |
| Intent bubble | paper fill, radius 12, small triangle pointer, ink text |
| Chip | slate-2 fill, ivory text, fully rounded |
| HP bar | slate-2 track, green fill (red under 34%), radius 4; heart icon at the left |
| Shield badge | blue fill, ivory number |
| Tabs | slate-2 idle, paper selected |
| Switch | standard pill switch, gold when on |

Text: `ui-rounded, "SF Pro Rounded", system-ui, sans-serif` everywhere. Titles 22–28px
weight 800; buttons 16–18px weight 700; body 14–16px weight 500; nothing under 12px.
The pixel font, the kit pictures and all `image-rendering: pixelated` rules are removed.

## 7. Backgrounds

SVG, 390x844 viewBox, drawn to cover. Two to four large soft flat shapes per act on a dark
base (act 1 forest greens, act 2 deep teal water and arches, act 3 dark basalt with ember
orange), the lower 60% darker and plain. `bg.menu`: a calm slate field with two or three
ivory dice shapes. Nothing may compete with tokens, bubbles or dice.

## 8. App icons

`app.icon` (SVG) plus the five PNG files in `APP_ICON_FILES` rendered from it (an ivory die
with a red sword icon on a slate field; the maskable one with safe padding). PNGs are
rasterised by the art script without new dependencies (for example by rendering the SVG in
Playwright's browser, which is already installed).

## 9. Asset list (0.3.0)

Kept ids (now flat SVG): every `hero`, `enemy`, `boss`, `item`, `sym`, `fx`, `kw`,
`status`, `intent`, `door`, `set`, `ui`, `bg`, `app` id. In the `die` category only
`die.jammed` and `die.cursed` remain (as icons). Removed: every `kit.*` id, `die.<hero>`,
`die.locked`, `die.used`, `die.blank`, and `die.face_*` (the die is drawn by ui). 169 ids.

Manifest (`src/art/generated/manifest.json`, type `ArtManifest`): `file` = `art/<id>.svg`,
`w`/`h` = the SVG viewBox size, `ax`/`ay` = centre, `render: 'flat'`, no `slice`.
`public/art/` contains only `.svg` files.

The content check (lead) will require: every listed id present as an `.svg` file with
`render: 'flat'`; no `.png` left in `public/art`; no `kit` category; tokens 96x96, icons
24x24, items and doors 48x48; palette at most 28; the five PNG app icons present.

## 10. Cut-over plan (keeps `main` green)

1. art builds the new generator in `tools/artgen/` writing `.svg` files next to the old
   PNGs, without touching what ui uses, and the style sheet mock (see BRIEF-3).
2. After the lead approves the style sheet, art produces the full set, then tells the lead.
3. In one coordinated step: lead switches `ASSET_LIST`, the content check and the `art`
   script to the new generator; art deletes `tools/voxelgen/`, the PNGs and the old
   generated JSON (font, layout); ui switches to SVG icons, tokens and CSS surfaces.
   During this step ui and art agree the order so the app never ships half-converted.
4. qa replaces look-specific checks (pixel-text boxes, kit render) with their flat
   equivalents and keeps every behavioural check.

## 11. Tests that must exist for the look (qa)

- Dice are flat front-on: each die element contains an icon and a number as separate
  elements, no 3D transform, ivory face and a rim in its hero colour (read computed styles).
- Every die state renders its distinguishing mark (kept ring + closed padlock, used grey,
  blank dash with no number, cursed crack with no number, jammed chain, lifted ring).
- No element uses the pixel font or `image-rendering: pixelated`; every text node's
  computed font family is the rounded system stack; no computed font size under 12px.
- No element uses a kit picture as `border-image` or background.
- Tokens: every hero, enemy and boss on screen is an `<img>` (or inline SVG) of its token
  `.svg`; bosses render about 1.5x enemy size.
