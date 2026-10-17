/**
 * The full asset list. Art must deliver exactly one sprite per id in ASSET_LIST
 * (checked by `npm run check:content`). UI looks sprites up by these ids.
 */
import { FACE_EFFECTS, KEYWORDS, STATUSES, SYMBOLS } from './content';
import { BOSS_ROSTER, ENEMY_ROSTER, HERO_ROSTER, ITEM_ROSTER } from './roster';

export type AssetCategory =
  | 'hero' | 'enemy' | 'boss' | 'item' | 'sym' | 'fx' | 'kw' | 'status' | 'die' | 'intent' | 'door' | 'set' | 'ui' | 'bg' | 'app' | 'kit';

export interface AssetSpec {
  /** `<category>.<name>`, e.g. "hero.bulwark". */
  id: string;
  category: AssetCategory;
  name: string;
  /** Art brief. */
  look: string;
}

const spec = (category: AssetCategory, key: string, name: string, look: string): AssetSpec => ({
  id: `${category}.${key}`, category, name, look,
});

const DIE_OVERLAYS: [string, string, string][] = [
  ['jammed', 'Jammed die', 'Flat icon: a chain, shown on a die an enemy has jammed and on its padlock button.'],
  ['cursed', 'Cursed face', 'Flat icon: a crack, shown on a face an enemy has cursed to blank.'],
];

const INTENTS: [string, string, string][] = [
  ['attack', 'Attack', 'Red sword pointing down.'],
  ['attack_all', 'Attack all', 'Three red swords fanned.'],
  ['shield', 'Shield', 'Blue shield.'],
  ['heal', 'Heal', 'Green plus.'],
  ['buff', 'Buff', 'Orange up arrow with a flex spark.'],
  ['debuff', 'Debuff', 'Purple down arrow.'],
  ['lockDie', 'Lock a die', 'Die wrapped in a chain with a padlock.'],
  ['curseFace', 'Curse a face', 'Die with one face cracked and dark.'],
  ['stealReroll', 'Steal a reroll', 'Hand snatching a circular reroll arrow.'],
  ['summon', 'Summon', 'Small creature silhouette with a plus.'],
  ['charge', 'Charging', 'Hourglass with a red glow.'],
];

const DOORS: [string, string, string][] = [
  ['elite', 'Elite door', 'Heavy iron door with a red skull knocker.'],
  ['rest', 'Rest door', 'Wooden door with a campfire sign.'],
  ['shop', 'Shop door', 'Striped awning door with a coin sign.'],
  ['event', 'Event door', 'Mysterious purple door with a question mark.'],
  ['treasure', 'Treasure door', 'Golden door with a chest emblem.'],
  ['onward', 'Onward door', 'Plain open archway with an arrow.'],
];

const UI_ICONS: [string, string, string][] = [
  ['logo', 'Game logo', 'Title art: a die and a short sword crossed, on a miniature base.'],
  ['reroll', 'Reroll', 'Circular arrow around a pip.'],
  ['lock', 'Lock', 'Closed padlock.'],
  ['unlock', 'Unlock', 'Open padlock.'],
  ['undo', 'Undo', 'Curved back arrow.'],
  ['end_turn', 'End turn', 'Hourglass / forward chevrons.'],
  ['settings', 'Settings', 'Chunky gear.'],
  ['back', 'Back', 'Left chevron.'],
  ['close', 'Close', 'X.'],
  ['check', 'Confirm', 'Tick.'],
  ['hp', 'Hit points', 'Red heart.'],
  ['shield', 'Shield', 'Blue shield.'],
  ['ward', 'Ward shield', 'Blue shield with a gold rim.'],
  ['gold', 'Gold', 'Stack of coins.'],
  ['downed', 'Downed', 'Small tombstone / dizzy stars.'],
  ['play', 'Play', 'Sword pointing right.'],
  ['daily', 'Daily run', 'Calendar page with a pip.'],
  ['collection', 'Collection', 'Open book.'],
  ['stats', 'Stats', 'Bar chart.'],
  ['feat', 'Feat', 'Medal with a ribbon.'],
  ['feat_locked', 'Feat locked', 'Grey medal outline.'],
  ['tutorial', 'Tutorial', 'Scroll with a question mark.'],
  ['export', 'Export save', 'Box with an up arrow.'],
  ['import', 'Import save', 'Box with a down arrow.'],
  ['reset', 'Reset progress', 'Trash bin.'],
  ['motion', 'Reduce motion', 'Feather / still lines.'],
  ['tier', 'Difficulty tier', 'Flame with a number plate.'],
  ['unknown', 'Not yet seen', 'Dark silhouette block with a question mark.'],
  ['rotate', 'Rotate device', 'Phone with a rotation arrow.'],
  ['info', 'Info', 'Letter i in a circle.'],
  ['skip', 'Skip', 'Double chevron.'],
  ['act', 'Act marker', 'Small flag.'],
  ['boss', 'Boss marker', 'Crowned skull.'],
  ['fight', 'Fight marker', 'Crossed swords.'],
  ['install', 'Add to Home Screen', 'A box with an arrow rising out of it (the share symbol).'],
  ['target', 'Choose the target', 'A reticle.'],
  ['peek', 'Peek', 'An eye.'],
];

/* The 0.2.0 interface kit (kit.*) was retired in 0.3.0: surfaces are drawn by ui in CSS. */

export const ASSET_LIST: readonly AssetSpec[] = [
  ...HERO_ROSTER.map((h) => spec('hero', h.id, h.name, `${h.look} Round light base.`)),
  ...ENEMY_ROSTER.map((e) => spec('enemy', e.id, e.name, `${e.look} Dark base.`)),
  ...BOSS_ROSTER.map((b) => spec('boss', b.id, b.name, `${b.look} Large dark base, about twice the footprint of a normal enemy.`)),
  ...ITEM_ROSTER.map((i) => spec('item', i.id, i.name, i.look)),
  ...SYMBOLS.map((s) => spec('sym', s, `${s} symbol`, {
    blade: 'Short sword, red.', guard: 'Kite shield, blue.', heart: 'Heart, green.', spark: 'Four-point star, yellow.', skull: 'Skull, violet.',
  }[s])),
  ...FACE_EFFECTS.map((f) => spec('fx', f, `${f} effect`, {
    damage: 'Slash mark.', shield: 'Shield plate.', heal: 'Plus.', weaken: 'Broken sword / down arrow.', focus: 'Reroll arrow with a plus.', blank: 'Empty dotted square.',
  }[f])),
  ...KEYWORDS.map((k) => spec('kw', k, `${k} keyword badge`, {
    cleave: 'Wide arc sweeping three dots.', echo: 'Two overlapping squares.', growth: 'Sprout with an up arrow.', reckless: 'Cracked heart.',
    pierce: 'Arrow through a shield.', venom: 'Green droplet.', ward: 'Shield with a lock.', twin: 'Two pips side by side with x2.',
    rally: 'Flag with a plus.', momentum: 'Spinning arrow with speed lines.', poised: 'Still eye / balanced scale.', execute: 'Axe over a half-empty heart.',
  }[k])),
  ...STATUSES.map((s) => spec('status', s, `${s} status`, {
    poison: 'Green skull drop.', weak: 'Bent sword.', strength: 'Flexed arm.', thorns: 'Spike ring.', regen: 'Green leaf with a plus.', mark: 'Red target reticle.',
  }[s])),
  ...DIE_OVERLAYS.map(([k, n, l]) => spec('die', k, n, l)),
  ...INTENTS.map(([k, n, l]) => spec('intent', k, n, l)),
  ...DOORS.map(([k, n, l]) => spec('door', k, n, l)),
  spec('set', 'pair', 'Pair badge', 'Two linked pips.'),
  spec('set', 'triple', 'Triple badge', 'Three pips in a crown.'),
  spec('set', 'rainbow', 'Rainbow badge', 'Three pips in three colours under an arc.'),
  ...UI_ICONS.map(([k, n, l]) => spec('ui', k, n, l)),
  spec('bg', 'act1', 'Act 1: Thornwood', 'Portrait background: mossy forest clearing, bramble walls, warm green light. Calm lower half so sprites read.'),
  spec('bg', 'act2', 'Act 2: Sunken Vault', 'Portrait background: flooded stone vault, teal water, pillars, chains. Calm lower half.'),
  spec('bg', 'act3', 'Act 3: Cinder Spire', 'Portrait background: volcanic tower interior, glowing cracks, dark basalt. Calm lower half.'),
  spec('bg', 'menu', 'Menu backdrop', 'Portrait background: a game table with a felt mat and scattered dice, soft vignette.'),
  spec('app', 'icon', 'App icon', 'Square: a white die showing a crossed-sword pip on a deep teal field. Also exported as PWA icon sizes into public/icons/.'),
];

export const ASSET_IDS: readonly string[] = ASSET_LIST.map((a) => a.id);

/** Files art must also write into public/icons/ for the PWA shell (ui references them). */
export const APP_ICON_FILES = [
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png', // 180x180, opaque background
  'favicon-32.png',
] as const;

/** One entry per sprite in src/art/generated/manifest.json. */
export interface SpriteInfo {
  /** Path relative to the site base, e.g. "art/hero.bulwark.png". */
  file: string;
  /** Native pixel size. Always displayed at integer or nearest-neighbour scale. */
  w: number;
  h: number;
  /** Anchor in native pixels: where the centre of the miniature's base sits (for lining units up on a row). */
  ax: number;
  ay: number;
  /**
   * How the generator made this sprite (set by the generator from the code path really used):
   *  'voxel' = a 3D voxel model drawn by the isometric renderer (characters, dice, every icon);
   *  'kit'   = an interface-kit piece (button, panel, tray, bar) drawn in the toy style;
   *  'scene' = a background.
   *  'flat'  = a flat vector drawing (version 0.3.0 onwards; see docs/flat-style.md).
   */
  render?: 'voxel' | 'kit' | 'scene' | 'flat';
  /** For stretchable kit pieces: 9-slice insets in native pixels [top, right, bottom, left]. */
  slice?: [number, number, number, number];
}

export interface ArtManifest {
  generatedBy: 'voxelgen' | 'artgen';
  /** The shared palette, as hex strings. */
  palette: string[];
  sprites: Record<string, SpriteInfo>;
}
