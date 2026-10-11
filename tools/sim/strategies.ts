/**
 * Named strategies the skilled bot can commit to. Committing fixes the party and tilts every
 * draft decision (faces, items, doors) toward the strategy; the fight play itself stays the same.
 */
import type { FaceEffect, HeroId, ItemId, KeywordId, SymbolId } from '@shared';

export interface Strategy {
  name: string;
  blurb: string;
  party: [HeroId, HeroId, HeroId];
  /** Multipliers (>1 = wants it) on the draft value of faces with these traits. */
  keywords?: Partial<Record<KeywordId, number>>;
  effects?: Partial<Record<FaceEffect, number>>;
  symbols?: Partial<Record<SymbolId, number>>;
  /** Multipliers on the draft value of items. */
  items: Partial<Record<ItemId, number>>;
  /** Blank faces are an asset (never replaced; events that blank a face are welcome). */
  keepBlanks?: boolean;
}

export const STRATEGIES: Record<string, Strategy> = {
  sets: {
    name: 'sets', blurb: 'Pairs and triples: one symbol on every die, wild die, set items.',
    party: ['redhand', 'duelist', 'bulwark'],
    symbols: { blade: 1.2 },
    items: { twin_charm: 2, crown_of_three: 2, mirror_shard: 2, double_or_nothing: 2, rainbow_prism: 0.3 },
  },
  venom: {
    name: 'venom', blurb: 'Stack Poison and let it spread.',
    party: ['bulwark', 'hexer', 'herbalist'],
    keywords: { venom: 1.3 },
    symbols: { skull: 1.1 },
    items: { venom_vial: 2, plague_censer: 2, cleaver_hook: 1.3 },
  },
  fortress: {
    name: 'fortress', blurb: 'Shield, Ward and thorns; damage comes from the shield itself.',
    party: ['bulwark', 'grower', 'herbalist'],
    effects: { shield: 1.2 },
    keywords: { ward: 1.2 },
    items: { ward_stone: 2, spiked_pommel: 2, thorn_mail: 2, tortoise_shell: 2, patient_hourglass: 1.5, oak_buckler: 1.3 },
  },
  growth: {
    name: 'growth', blurb: 'Faces that get bigger every use, and Rally to feed the others.',
    party: ['bulwark', 'grower', 'duelist'],
    keywords: { growth: 1.3, rally: 1.3 },
    items: { seedling_pot: 2 },
  },
  reckless: {
    name: 'reckless', blurb: 'Huge hits paid for in HP; stronger when hurt; Execute to finish.',
    party: ['bulwark', 'redhand', 'herbalist'],
    keywords: { reckless: 1.15, execute: 1.2 },
    items: { red_bandana: 1.5, reckless_idol: 2, executioners_hood: 2, glass_cannon: 1.5, leech_fang: 2 },
  },
  blanks: {
    name: 'blanks', blurb: 'Make blank faces deal damage and give shield, then collect blanks.',
    party: ['redhand', 'hexer', 'herbalist'],
    items: { hollow_die: 3, void_pip: 3, bone_charm: 0.1 },
    keepBlanks: true,
  },
  tempo: {
    name: 'tempo', blurb: 'More rerolls, and faces and items that pay for every reroll spent.',
    party: ['bulwark', 'gambler', 'herbalist'],
    keywords: { momentum: 1.3 },
    effects: { focus: 1.2 },
    items: { loaded_pip: 2, gamblers_ante: 2, lucky_coin: 1.3, pip_magnet: 2, kings_die: 0.2, patient_hourglass: 0.2 },
  },
  echo: {
    name: 'echo', blurb: 'One great face, copied by Echo and doubled by Twin.',
    party: ['bulwark', 'duelist', 'automaton'],
    keywords: { echo: 1.3, twin: 1.3 },
    items: { echo_bell: 2, first_pick_glove: 1.3 },
  },
};

export const STRATEGY_NAMES = Object.keys(STRATEGIES);
