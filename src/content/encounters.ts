/** Who you fight where. Act 1 slot 1 never has dice-trick users; no encounter has more than two. */
import type { EncounterDef, TutorialDef } from '@shared';

export const encounters: EncounterDef[] = [
  // ---- Act 1: Thornwood
  { id: 'a1.rat_pack', act: 1, kind: 'normal', slots: [1], enemies: ['gnaw_rat', 'gnaw_rat', 'twig_archer'] },
  { id: 'a1.mud_and_teeth', act: 1, kind: 'normal', slots: [1], enemies: ['mud_slime', 'gnaw_rat'] },
  { id: 'a1.thorn_patrol', act: 1, kind: 'normal', slots: [1, 2], enemies: ['bramble_imp', 'bramble_imp', 'gnaw_rat'] },
  { id: 'a1.spore_grove', act: 1, kind: 'normal', slots: [2], enemies: ['mushroom_brute', 'twig_archer'] },
  { id: 'a1.magpie_gang', act: 1, kind: 'normal', slots: [2, 3], enemies: ['magpie_thief', 'gnaw_rat', 'gnaw_rat'] },
  { id: 'a1.webbed_path', act: 1, kind: 'normal', slots: [2, 3], enemies: ['web_spinner', 'bramble_imp', 'gnaw_rat'] },
  { id: 'a1.sticky_mire', act: 1, kind: 'normal', slots: [3], enemies: ['mud_slime', 'web_spinner'] },
  { id: 'a1.thieves_brew', act: 1, kind: 'normal', slots: [3], enemies: ['magpie_thief', 'mushroom_brute'] },
  { id: 'a1.elite', act: 1, kind: 'elite', enemies: ['hollow_stag', 'bramble_imp'] },
  { id: 'a1.boss', act: 1, kind: 'boss', enemies: ['bramble_king'] },

  // ---- Act 2: Sunken Vault
  { id: 'a2.deck_hands', act: 2, kind: 'normal', slots: [1], enemies: ['drowned_sailor', 'drowned_sailor'] },
  { id: 'a2.tide_pool', act: 2, kind: 'normal', slots: [1], enemies: ['crab_knight', 'tide_witch'] },
  { id: 'a2.ink_and_steel', act: 2, kind: 'normal', slots: [1, 2], enemies: ['ink_squid', 'drowned_sailor'] },
  { id: 'a2.lancers', act: 2, kind: 'normal', slots: [2], enemies: ['eel_lancer', 'eel_lancer', 'bell_diver'] },
  { id: 'a2.greedy_chest', act: 2, kind: 'normal', slots: [2], enemies: ['coin_mimic', 'drowned_sailor'] },
  { id: 'a2.reef_wall', act: 2, kind: 'normal', slots: [2, 3], enemies: ['barnacle_golem', 'bell_diver'] },
  { id: 'a2.dark_water', act: 2, kind: 'normal', slots: [3], enemies: ['ink_squid', 'eel_lancer', 'tide_witch'] },
  { id: 'a2.vault_guard', act: 2, kind: 'normal', slots: [3], enemies: ['crab_knight', 'drowned_sailor', 'coin_mimic'] },
  { id: 'a2.elite', act: 2, kind: 'elite', enemies: ['anchor_hulk', 'bell_diver'] },
  { id: 'a2.boss', act: 2, kind: 'boss', enemies: ['drowned_bell'] },

  // ---- Act 3: Cinder Spire
  { id: 'a3.kindling', act: 3, kind: 'normal', slots: [1], enemies: ['ember_whelp', 'ash_cultist', 'cinder_bat'] },
  { id: 'a3.smithy', act: 3, kind: 'normal', slots: [1], enemies: ['forge_smith', 'cinder_bat', 'ember_whelp'] },
  { id: 'a3.chain_gang', act: 3, kind: 'normal', slots: [1, 2], enemies: ['chain_warden', 'ember_whelp'] },
  { id: 'a3.slag_heap', act: 3, kind: 'normal', slots: [2], enemies: ['slag_golem', 'ash_cultist'] },
  { id: 'a3.hex_circle', act: 3, kind: 'normal', slots: [2, 3], enemies: ['soot_hexer', 'ash_cultist', 'cinder_bat'] },
  { id: 'a3.furnace', act: 3, kind: 'normal', slots: [3], enemies: ['slag_golem', 'forge_smith'] },
  { id: 'a3.jailers', act: 3, kind: 'normal', slots: [3], enemies: ['chain_warden', 'soot_hexer', 'forge_smith'] },
  { id: 'a3.elite', act: 3, kind: 'elite', enemies: ['obsidian_knight', 'ash_cultist'] },
  { id: 'a3.boss', act: 3, kind: 'boss', enemies: ['pip_eater'] },
];

/** The guided first fight: two slow enemies that cannot down anyone before turn 6. */
export const tutorial: TutorialDef = {
  seed: 'tutorial',
  heroes: ['bulwark', 'duelist', 'herbalist'],
  encounter: { id: 'tutorial', act: 1, kind: 'normal', slots: [1], enemies: ['gnaw_rat', 'mud_slime'] },
};
