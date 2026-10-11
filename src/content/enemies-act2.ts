/** Act 2: Sunken Vault. */
import type { EnemyDef } from '@shared';
import { scaleAtk, tune } from './tuning';

/** Base damage of the Drowned Bell's Crash (before the act dial). */
const CRASH = 14;

export const act2Enemies: EnemyDef[] = tune([
  {
    id: 'drowned_sailor', name: 'Drowned Sailor', blurb: 'Still swinging for a ship that sank long ago.', kind: 'normal', act: 2, hp: 18,
    moves: [
      { id: 'cutlass', name: 'Cutlass', actions: [{ type: 'attack', amount: 5, target: 'front' }] },
      { id: 'heave', name: 'Heave', actions: [{ type: 'attack', amount: 3, target: 'random', hits: 2 }] },
    ],
    ai: { type: 'weighted', weights: { cutlass: 3, heave: 2 } },
  },
  {
    id: 'crab_knight', name: 'Crab Knight', blurb: 'Hides, then pinches. Then hides again.', kind: 'normal', act: 2, hp: 20,
    moves: [
      { id: 'shell', name: 'Shell Up', actions: [{ type: 'shield', amount: 6, target: 'self' }] },
      { id: 'pinch', name: 'Big Pinch', actions: [{ type: 'attack', amount: 8, target: 'front' }] },
    ],
    ai: { type: 'cycle', order: ['shell', 'pinch'] },
  },
  {
    id: 'ink_squid', name: 'Ink Squid', blurb: 'One squirt and your best face is a blot.', kind: 'normal', act: 2, hp: 15,
    moves: [
      { id: 'ink', name: 'Ink Blot', actions: [{ type: 'curseFace', target: 'random', face: 'highest' }, { type: 'attack', amount: 2, target: 'random' }] },
      { id: 'slap', name: 'Tentacle Slap', actions: [{ type: 'attack', amount: 5, target: 'lowestHp' }] },
    ],
    ai: { type: 'cycle', order: ['ink', 'slap'] },
  },
  {
    id: 'barnacle_golem', name: 'Barnacle Golem', blurb: 'Every minute you leave it standing, it gets worse.', kind: 'normal', act: 2, hp: 30,
    passiveText: 'Encrusted: gains 1 Strength at the end of every enemy turn, so each of its hits deals 1 more for the rest of the fight.',
    passives: [{ trigger: 'enemyPhaseEnd', effects: [{ type: 'status', target: 'self', status: 'strength', amount: 1 }] }],
    moves: [{ id: 'pound', name: 'Pound', actions: [{ type: 'attack', amount: 4, target: 'front' }] }],
    ai: { type: 'cycle', order: ['pound'] },
  },
  {
    id: 'eel_lancer', name: 'Eel Lancer', blurb: 'Its trident goes straight through a shield.', kind: 'normal', act: 2, hp: 15,
    moves: [
      { id: 'lance', name: 'Trident Lunge', actions: [{ type: 'attack', amount: 4, target: 'lowestHp', pierce: true }] },
      { id: 'jolt', name: 'Jolt', actions: [{ type: 'attack', amount: 3, target: 'back', pierce: true }] },
    ],
    ai: { type: 'weighted', weights: { lance: 3, jolt: 2 } },
  },
  {
    id: 'bell_diver', name: 'Bell Diver', blurb: 'Slow in the suit, but it keeps its friends dry.', kind: 'normal', act: 2, hp: 17,
    moves: [
      { id: 'cover', name: 'Air Line', actions: [{ type: 'shield', amount: 4, target: 'otherAllies' }, { type: 'attack', amount: 2, target: 'front' }] },
      { id: 'bonk', name: 'Helmet Bonk', actions: [{ type: 'attack', amount: 5, target: 'front' }] },
    ],
    ai: { type: 'cycle', order: ['cover', 'bonk'] },
  },
  {
    id: 'tide_witch', name: 'Tide Witch', blurb: 'Mends her friends (never herself) and salts your wounds.', kind: 'normal', act: 2, hp: 14,
    moves: [
      { id: 'mend', name: 'Mending Tide', actions: [{ type: 'heal', amount: 6, target: 'otherAllies' }, { type: 'attack', amount: 2, target: 'random' }] },
      { id: 'brine', name: 'Brine Curse', actions: [{ type: 'attack', amount: 1, target: 'all', poison: 2 }] },
    ],
    ai: { type: 'cycle', order: ['brine', 'mend'] },
  },
  {
    id: 'coin_mimic', name: 'Coin Mimic', blurb: 'Full of gold. Also teeth.', kind: 'normal', act: 2, hp: 22, gold: 12,
    passiveText: 'Drops 12 extra gold when it dies.',
    moves: [
      { id: 'pilfer', name: 'Pilfer', actions: [{ type: 'stealReroll', amount: 1 }, { type: 'attack', amount: 3, target: 'random' }] },
      { id: 'chomp', name: 'Chomp', actions: [{ type: 'attack', amount: 6, target: 'front' }] },
    ],
    ai: { type: 'cycle', order: ['pilfer', 'chomp'] },
  },
  {
    id: 'anchor_hulk', name: 'Anchor Hulk', blurb: 'Takes a whole turn to lift the anchor. Use it.', kind: 'elite', act: 2, hp: 56, gold: 6,
    moves: [
      { id: 'heave', name: 'Heave Anchor', actions: [{ type: 'charge' }, { type: 'lockDie', target: 'highestHp' }] },
      { id: 'slam', name: 'Anchor Slam', actions: [{ type: 'attack', amount: 8, target: 'all' }] },
      { id: 'backhand', name: 'Backhand', actions: [{ type: 'attack', amount: 6, target: 'front' }] },
    ],
    ai: { type: 'cycle', order: ['heave', 'slam', 'backhand'] },
  },
  {
    id: 'drowned_bell', name: 'The Drowned Bell', blurb: 'It tolls three times. Nobody has heard a fourth.', kind: 'boss', act: 2, hp: 90,
    passiveText: 'The Toll: each toll jams one hero\'s die for the next turn and counts down 3, 2, 1. After the third toll comes the Crash: '
      + `${scaleAtk(2, CRASH)} damage to every hero. Bring`
      + ' the Bell to half HP or less and it cracks: the countdown stops for good and it flails with its tentacles instead.',
    moves: [
      { id: 'toll3', name: 'Toll (3 left)', actions: [{ type: 'lockDie', target: 'random' }, { type: 'attack', amount: 3, target: 'all' }] },
      { id: 'toll2', name: 'Toll (2 left)', actions: [{ type: 'lockDie', target: 'random' }, { type: 'attack', amount: 4, target: 'all' }] },
      { id: 'toll1', name: 'Toll (1 left)', actions: [{ type: 'lockDie', target: 'random' }, { type: 'attack', amount: 5, target: 'all' }] },
      { id: 'crash', name: 'The Crash', actions: [{ type: 'attack', amount: CRASH, target: 'all' }] },
      { id: 'flail', name: 'Tentacle Flail', actions: [{ type: 'attack', amount: 4, target: 'random', hits: 2 }] },
      { id: 'clang', name: 'Cracked Clang', actions: [{ type: 'lockDie', target: 'random' }, { type: 'attack', amount: 5, target: 'all' }] },
    ],
    ai: { type: 'cycle', order: ['toll3', 'toll2', 'toll1', 'crash'] },
    phases: [{ hpAtMostPct: 50, ai: { type: 'cycle', order: ['flail', 'clang'] } }],
  },
]);
