/** Act 1: Thornwood. No single enemy turn here may deal more than 60% of a starter hero's HP to one hero. */
import type { EnemyDef } from '@shared';
import { tune } from './tuning';

export const act1Enemies: EnemyDef[] = tune([
  {
    id: 'gnaw_rat', name: 'Gnaw Rat', blurb: 'Bites first, thinks never.', kind: 'normal', act: 1, hp: 7,
    moves: [{ id: 'bite', name: 'Bite', actions: [{ type: 'attack', amount: 2, target: 'front' }] }],
    ai: { type: 'cycle', order: ['bite'] },
  },
  {
    id: 'bramble_imp', name: 'Bramble Imp', blurb: 'All elbows and thorns. Poke it at your own risk.', kind: 'normal', act: 1, hp: 8,
    startStatuses: { thorns: 1 },
    passiveText: 'Thorns 1: every die that hits it deals 1 damage back to the hero who rolled it.',
    moves: [
      { id: 'jab', name: 'Twig Jab', actions: [{ type: 'attack', amount: 2, target: 'front' }] },
      { id: 'prickle', name: 'Prickle', actions: [{ type: 'attack', amount: 1, target: 'random', hits: 2 }] },
    ],
    ai: { type: 'cycle', order: ['jab', 'prickle'] },
  },
  {
    id: 'mud_slime', name: 'Mud Slime', blurb: 'Slow. Heavy. Patient.', kind: 'normal', act: 1, hp: 16,
    moves: [
      { id: 'gather', name: 'Gather', actions: [{ type: 'charge' }, { type: 'shield', amount: 3, target: 'self' }] },
      { id: 'slam', name: 'Mud Slam', actions: [{ type: 'attack', amount: 4, target: 'front' }] },
    ],
    ai: { type: 'cycle', order: ['gather', 'slam'] },
  },
  {
    id: 'twig_archer', name: 'Twig Archer', blurb: 'Always picks on whoever looks worst.', kind: 'normal', act: 1, hp: 8,
    moves: [{ id: 'shot', name: 'Aimed Shot', actions: [{ type: 'attack', amount: 3, target: 'lowestHp' }] }],
    ai: { type: 'cycle', order: ['shot'] },
  },
  {
    id: 'mushroom_brute', name: 'Mushroom Brute', blurb: 'Breathe in. Regret it.', kind: 'normal', act: 1, hp: 13,
    moves: [
      { id: 'spores', name: 'Spore Puff', actions: [{ type: 'attack', amount: 1, target: 'random', poison: 2 }] },
      { id: 'thump', name: 'Thump', actions: [{ type: 'attack', amount: 3, target: 'front' }] },
    ],
    ai: { type: 'cycle', order: ['spores', 'thump'] },
  },
  {
    id: 'magpie_thief', name: 'Magpie Thief', blurb: 'Your rerolls look shiny to it.', kind: 'normal', act: 1, hp: 10,
    moves: [
      { id: 'snatch', name: 'Snatch', actions: [{ type: 'stealReroll', amount: 1 }, { type: 'attack', amount: 1, target: 'random' }] },
      { id: 'peck', name: 'Peck', actions: [{ type: 'attack', amount: 3, target: 'random' }] },
    ],
    ai: { type: 'cycle', order: ['peck', 'snatch'] },
  },
  {
    id: 'web_spinner', name: 'Web Spinner', blurb: 'Wraps up a die for later.', kind: 'normal', act: 1, hp: 11,
    moves: [
      { id: 'web', name: 'Web Shot', actions: [{ type: 'lockDie', target: 'random' }, { type: 'attack', amount: 1, target: 'front' }] },
      { id: 'bite', name: 'Fang Bite', actions: [{ type: 'attack', amount: 3, target: 'front' }] },
    ],
    ai: { type: 'cycle', order: ['bite', 'web'] },
  },
  {
    id: 'hollow_stag', name: 'Hollow Stag', blurb: 'Paws the ground once. That is your warning.', kind: 'elite', act: 1, hp: 34, gold: 4,
    moves: [
      { id: 'paw', name: 'Paw the Ground', actions: [{ type: 'charge' }, { type: 'shield', amount: 4, target: 'self' }] },
      { id: 'stampede', name: 'Stampede', actions: [{ type: 'attack', amount: 5, target: 'all' }] },
      { id: 'gore', name: 'Gore', actions: [{ type: 'attack', amount: 4, target: 'highestHp' }] },
    ],
    ai: { type: 'cycle', order: ['paw', 'stampede', 'gore'] },
  },
  {
    id: 'bramble_king', name: 'The Bramble King', blurb: 'The oldest stump in the wood, and the worst tempered.', kind: 'boss', act: 1, hp: 40,
    passiveText: 'Thorn Stance: on every second turn the King has Thorns 2, so each die that hits him deals 2 damage back. '
      + 'On the turns between he is open. Poison and waiting both get around the thorns. Every other time he takes the stance he also grows a Bramble Imp.',
    moves: [
      {
        id: 'stance', name: 'Thorn Stance',
        actions: [
          { type: 'status', status: 'thorns', amount: 2, target: 'self', side: 'enemy' },
          { type: 'summon', enemy: 'bramble_imp', count: 1 },
          { type: 'attack', amount: 2, target: 'front' },
        ],
      },
      {
        id: 'lash', name: 'Vine Lash',
        actions: [
          { type: 'status', status: 'thorns', amount: -2, target: 'self', side: 'enemy' },
          { type: 'attack', amount: 3, target: 'all' },
        ],
      },
      {
        id: 'bristle', name: 'Bristle',
        actions: [
          { type: 'status', status: 'thorns', amount: 2, target: 'self', side: 'enemy' },
          { type: 'attack', amount: 2, target: 'front' },
        ],
      },
    ],
    ai: { type: 'cycle', order: ['stance', 'lash', 'bristle', 'lash'] },
  },
]);
