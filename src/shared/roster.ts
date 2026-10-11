/**
 * The fixed roster: every hero, enemy, boss and item that ships at launch.
 *
 * Owned by the lead. IDs and names here are the contract between teams:
 *  - art draws one sprite per entry (asset id = `<kind>.<id>`, see assets.ts)
 *  - designer authors stats/behaviour for exactly these ids in src/content/
 *  - `look` is the art brief; `role` is the design intent (designer owns final numbers)
 */

export interface RosterEntry {
  readonly id: string;
  readonly name: string;
  /** Art brief: silhouette, parts and colours. */
  readonly look: string;
  /** Design intent in one line. */
  readonly role: string;
}

export const HERO_ROSTER = [
  { id: 'bulwark', name: 'Tamsin the Bulwark', look: 'Stocky knight, bucket helm with plume, tower shield, short mace. Steel blue + cream.', role: 'Starter. Shields and Ward; protects the party.' },
  { id: 'duelist', name: 'Rook the Duelist', look: 'Slim fencer, wide feathered hat, rapier held forward, half-cape. Crimson + black.', role: 'Starter. Blade damage, Pierce, Poised.' },
  { id: 'herbalist', name: 'Odalie the Herbalist', look: 'Hooded healer, big backpack of plants, sickle, satchel. Leaf green + tan.', role: 'Starter. Heals and Venom.' },
  { id: 'gambler', name: 'Sixpence the Gambler', look: 'Top hat, long coat, fan of cards in one hand, coin in the other. Purple + gold.', role: 'Unlock. Momentum and rerolls; Spark faces.' },
  { id: 'redhand', name: 'Hroda Redhand', look: 'Huge two-handed axe, bare arms, horned helm, fur collar. Rust red + bone.', role: 'Unlock. Reckless big hits, Execute.' },
  { id: 'automaton', name: 'Brasswick the Automaton', look: 'Boxy clockwork robot, key on back, round lens eye, piston arm. Brass + teal.', role: 'Unlock. Echo and Twin.' },
  { id: 'grower', name: 'Mossback the Grower', look: 'Turtle-like druid with a sapling growing from its shell, watering can. Moss green + brown.', role: 'Unlock. Growth scaling, Rally.' },
  { id: 'hexer', name: 'Vesper the Hexer', look: 'Tall pointed hood, floating dark orb, tattered robe, mask. Indigo + pale violet.', role: 'Unlock. Blank faces, Weaken, Skull symbol.' },
] as const satisfies readonly RosterEntry[];

export const ENEMY_ROSTER = [
  // Act 1: Thornwood
  { id: 'gnaw_rat', name: 'Gnaw Rat', look: 'Fat rat, big front teeth, pink tail. Grey-brown.', role: 'Act 1. Weak fast attacker, comes in packs.' },
  { id: 'bramble_imp', name: 'Bramble Imp', look: 'Small thorny goblin with leaf ears and a twig spear. Green + brown.', role: 'Act 1. Thorns; punishes many small hits.' },
  { id: 'mud_slime', name: 'Mud Slime', look: 'Blobby cube of mud with two eyes and a dripping top. Brown.', role: 'Act 1. High HP, slow heavy hit every other turn.' },
  { id: 'twig_archer', name: 'Twig Archer', look: 'Stick-figure woodling with a bow and quiver. Tan + green.', role: 'Act 1. Targets the lowest-HP hero.' },
  { id: 'mushroom_brute', name: 'Mushroom Brute', look: 'Wide red-capped mushroom with stubby fists. Red + cream.', role: 'Act 1. Applies poison spores.' },
  { id: 'magpie_thief', name: 'Magpie Thief', look: 'Black and white bird with a mask, holding a shiny die. Black + white + gold.', role: 'Act 1. Steals a reroll.' },
  { id: 'web_spinner', name: 'Web Spinner', look: 'Round spider with long legs and a silk bundle. Dark purple + white.', role: 'Act 1. Locks a die in web.' },
  { id: 'hollow_stag', name: 'Hollow Stag', look: 'Skeletal deer with glowing eyes and large antlers. Bone + teal.', role: 'Act 1 elite. Charges up then hits everyone.' },
  // Act 2: Sunken Vault
  { id: 'drowned_sailor', name: 'Drowned Sailor', look: 'Bloated sailor zombie with a striped shirt and cutlass. Sea green + navy.', role: 'Act 2. Solid attacker.' },
  { id: 'crab_knight', name: 'Crab Knight', look: 'Crab with one giant claw and a tiny helmet. Orange + steel.', role: 'Act 2. Alternates big shield and big pinch.' },
  { id: 'ink_squid', name: 'Ink Squid', look: 'Squid with big eyes spraying a black ink blob. Violet + black.', role: 'Act 2. Curses a face to blank.' },
  { id: 'barnacle_golem', name: 'Barnacle Golem', look: 'Boulder golem crusted with shells, heavy arms. Grey + cream.', role: 'Act 2. Very high HP, gains strength over time.' },
  { id: 'eel_lancer', name: 'Eel Lancer', look: 'Upright eel with a trident and fin crest. Yellow + dark blue.', role: 'Act 2. Piercing attacks that ignore shield.' },
  { id: 'bell_diver', name: 'Bell Diver', look: 'Old brass diving suit with a round helmet and hose. Brass + dark teal.', role: 'Act 2. Shields its allies.' },
  { id: 'tide_witch', name: 'Tide Witch', look: 'Seaweed-haired witch with a shell staff. Teal + magenta.', role: 'Act 2. Heals allies, poisons heroes.' },
  { id: 'coin_mimic', name: 'Coin Mimic', look: 'Treasure chest with teeth and a tongue, coins spilling. Brown + gold.', role: 'Act 2. Steals rerolls; drops extra gold.' },
  { id: 'anchor_hulk', name: 'Anchor Hulk', look: 'Giant drowned brute swinging a ship anchor. Sea green + iron.', role: 'Act 2 elite. Huge telegraphed slam, locks a die.' },
  // Act 3: Cinder Spire
  { id: 'ember_whelp', name: 'Ember Whelp', look: 'Tiny dragon with stubby wings and a flame on its tail. Orange + red.', role: 'Act 3. Fast attacker, hits all heroes weakly.' },
  { id: 'ash_cultist', name: 'Ash Cultist', look: 'Robed figure with a tall hood and a burning censer. Grey + ember orange.', role: 'Act 3. Buffs allies with strength.' },
  { id: 'slag_golem', name: 'Slag Golem', look: 'Molten rock golem with glowing cracks. Black + bright orange.', role: 'Act 3. Thorns and heavy hits.' },
  { id: 'cinder_bat', name: 'Cinder Bat', look: 'Bat with flaming wing edges and big ears. Dark red + yellow.', role: 'Act 3. Steals a reroll and nips.' },
  { id: 'forge_smith', name: 'Forge Smith', look: 'Squat masked smith with a huge hammer and apron. Iron + orange.', role: 'Act 3. Shields allies heavily, moderate hits.' },
  { id: 'chain_warden', name: 'Chain Warden', look: 'Armoured jailer with a ring of keys and long chains. Dark steel + gold.', role: 'Act 3. Locks dice.' },
  { id: 'soot_hexer', name: 'Soot Hexer', look: 'Thin sorcerer with a cracked mask and smoke hands. Black + violet.', role: 'Act 3. Curses faces to blank.' },
  { id: 'obsidian_knight', name: 'Obsidian Knight', look: 'Tall black glass knight with a jagged greatsword. Black + purple glint.', role: 'Act 3 elite. Shield wall then execution strike.' },
] as const satisfies readonly RosterEntry[];

export const BOSS_ROSTER = [
  { id: 'bramble_king', name: 'The Bramble King', look: 'Massive tree-stump monarch with a thorn crown, root legs and a vine whip. Dark green + brown + red berries.', role: 'Act 1 boss. Alternates a thorn stance (attackers are hurt) with open turns; regrows imps.' },
  { id: 'drowned_bell', name: 'The Drowned Bell', look: 'Enormous cracked bronze bell with tentacles underneath and a glowing clapper eye. Bronze + teal.', role: 'Act 2 boss. Tolls: locks a telegraphed die each turn and counts down to a party-wide crash.' },
  { id: 'pip_eater', name: 'The Pip Eater', look: 'Fat dragon coiled on a hoard of dice, a die in its jaws, small wings. Crimson + gold + white pips.', role: 'Act 3 boss. Eats pips: curses faces to blank and grows stronger for every blank you roll.' },
] as const satisfies readonly RosterEntry[];

export const ITEM_ROSTER = [
  // Base pool (28)
  { id: 'whetstone', name: 'Whetstone', look: 'Grey sharpening stone with a spark.', role: 'Owner damage faces +1.' },
  { id: 'oak_buckler', name: 'Oak Buckler', look: 'Small round wooden shield with an iron boss.', role: 'Owner starts each fight with shield.' },
  { id: 'healers_satchel', name: "Healer's Satchel", look: 'Leather bag with a green cross.', role: 'Heal faces +1 (party).' },
  { id: 'lucky_coin', name: 'Lucky Coin', look: 'Gold coin with a clover.', role: '+1 reroll on the first turn of each fight.' },
  { id: 'hollow_die', name: 'Hollow Die', look: 'Grey die with empty faces and a crack.', role: 'Blank faces deal 2 damage.' },
  { id: 'loaded_pip', name: 'Loaded Pip', look: 'White die with one heavy red pip.', role: 'Rerolled dice get +1.' },
  { id: 'first_pick_glove', name: 'First-Pick Glove', look: 'Leather glove pinching a small die.', role: 'The first die you lock each turn is doubled.' },
  { id: 'thorn_mail', name: 'Thorn Mail', look: 'Green chest armour covered in spikes.', role: 'Owner has thorns.' },
  { id: 'venom_vial', name: 'Venom Vial', look: 'Round flask of bubbling green liquid.', role: 'Poison you apply is +1.' },
  { id: 'twin_charm', name: 'Twin Charm', look: 'Two linked gold rings.', role: 'Pairs give +1 extra.' },
  { id: 'crown_of_three', name: 'Crown of Three', look: 'Small crown with three gems.', role: 'Triple bursts are stronger.' },
  { id: 'patient_hourglass', name: 'Patient Hourglass', look: 'Wooden hourglass with blue sand.', role: 'Unused rerolls become shield at end of turn.' },
  { id: 'gamblers_ante', name: "Gambler's Ante", look: 'Stack of three poker chips.', role: '+1 reroll every turn, owner has less max HP.' },
  { id: 'iron_ration', name: 'Iron Ration', look: 'Tin of food with a fork.', role: 'Owner +max HP.' },
  { id: 'seedling_pot', name: 'Seedling Pot', look: 'Clay pot with a two-leaf sprout.', role: 'Growth faces grow faster.' },
  { id: 'red_bandana', name: 'Red Bandana', look: 'Knotted red headband.', role: 'Owner hits harder at or below half HP.' },
  { id: 'mirror_shard', name: 'Mirror Shard', look: 'Jagged piece of mirror with a glint.', role: "Owner's die is wild for sets." },
  { id: 'ward_stone', name: 'Ward Stone', look: 'Blue rune-carved pebble.', role: "Owner's shield does not expire." },
  { id: 'bone_charm', name: 'Bone Charm', look: 'Small skull on a cord.', role: 'Owner cannot be cursed.' },
  { id: 'unjam_oil', name: 'Unjam Oil', look: 'Brass oil can with a drop.', role: 'Party dice cannot be locked by enemies.' },
  { id: 'purse_string', name: 'Purse String', look: 'Tied coin pouch.', role: 'Rerolls cannot be stolen; more gold.' },
  { id: 'spiked_pommel', name: 'Spiked Pommel', look: 'Sword hilt with a spike on the end.', role: 'Owner shield faces also hurt the front enemy.' },
  { id: 'leech_fang', name: 'Leech Fang', look: 'Curved red tooth.', role: 'Owner damage faces heal the owner.' },
  { id: 'battle_drum', name: 'Battle Drum', look: 'Red drum with crossed sticks.', role: 'First die used each turn +2.' },
  { id: 'last_word', name: 'Last Word', look: 'Scroll with a wax seal.', role: 'Last die used each turn +2.' },
  { id: 'cleaver_hook', name: 'Cleaver Hook', look: 'Wide butcher blade with a hooked tip.', role: 'Owner damage faces gain Cleave at -1.' },
  { id: 'field_medic_kit', name: 'Field Medic Kit', look: 'White box with a red heart.', role: 'Downed heroes return healthier; party heals between fights.' },
  { id: 'merchants_scale', name: "Merchant's Scale", look: 'Brass balance scale.', role: 'Cheaper shops.' },
  // Feat-unlocked pool (12)
  { id: 'void_pip', name: 'Void Pip', look: 'Black die with a purple glow and no pips.', role: 'Blank faces give shield to the party.' },
  { id: 'echo_bell', name: 'Echo Bell', look: 'Small silver handbell with sound rings.', role: 'Echo faces +2.' },
  { id: 'reckless_idol', name: 'Reckless Idol', look: 'Red horned stone idol.', role: 'Reckless faces +3.' },
  { id: 'executioners_hood', name: "Executioner's Hood", look: 'Black hood with two eye holes.', role: 'Owner damage faces gain Execute.' },
  { id: 'rainbow_prism', name: 'Rainbow Prism', look: 'Glass triangle splitting light into colours.', role: 'Three different symbols count as a set.' },
  { id: 'pip_magnet', name: 'Pip Magnet', look: 'Red horseshoe magnet pulling a pip.', role: 'Rerolling exactly one die is free once per turn.' },
  { id: 'glass_cannon', name: 'Glass Cannon', look: 'Tiny see-through cannon.', role: 'Owner damage +3, max HP down.' },
  { id: 'tortoise_shell', name: 'Tortoise Shell', look: 'Green domed shell.', role: 'All shield gained +1.' },
  { id: 'plague_censer', name: 'Plague Censer', look: 'Hanging incense burner with green smoke.', role: 'Poison spreads when a poisoned enemy dies.' },
  { id: 'double_or_nothing', name: 'Double or Nothing', look: 'Two dice, one bright one dark.', role: 'Triples make every die in the set resolve twice.' },
  { id: 'phoenix_feather', name: 'Phoenix Feather', look: 'Orange feather with a flame tip.', role: 'Once per run the owner revives when downed.' },
  { id: 'kings_die', name: "King's Die", look: 'Gold die with a crown pip.', role: 'All dice +1 on turns with no rerolls.' },
] as const satisfies readonly RosterEntry[];

export type HeroId = (typeof HERO_ROSTER)[number]['id'];
export type EnemyId = (typeof ENEMY_ROSTER)[number]['id'] | BossId;
export type BossId = (typeof BOSS_ROSTER)[number]['id'];
export type ItemId = (typeof ITEM_ROSTER)[number]['id'];

/** Heroes available before any feat is earned. */
export const STARTER_HEROES: readonly HeroId[] = ['bulwark', 'duelist', 'herbalist'];

/** Launch content counts required by BRIEF.md; enforced by `npm run check:content`. */
export const REQUIRED_COUNTS = {
  heroes: 8,
  starterHeroes: 3,
  enemies: 25,
  bosses: 3,
  items: 40,
  keywordsMin: 10,
  eventsMin: 10,
  feats: 20,
  tiers: 5,
} as const;
