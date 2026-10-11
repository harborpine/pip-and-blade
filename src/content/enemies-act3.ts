/** Act 3: Cinder Spire. */
import type { EnemyDef } from '@shared';
import { tune } from './tuning';

export const act3Enemies: EnemyDef[] = tune([
  {
    id: 'ember_whelp', name: 'Ember Whelp', blurb: 'Small, quick, and it sneezes fire on everyone.', kind: 'normal', act: 3, hp: 16,
    moves: [
      { id: 'sneeze', name: 'Fire Sneeze', actions: [{ type: 'attack', amount: 3, target: 'all' }] },
      { id: 'nip', name: 'Nip', actions: [{ type: 'attack', amount: 6, target: 'front' }] },
    ],
    ai: { type: 'weighted', weights: { sneeze: 3, nip: 2 } },
  },
  {
    id: 'ash_cultist', name: 'Ash Cultist', blurb: 'Chants, and everything near it hits harder.', kind: 'normal', act: 3, hp: 18,
    moves: [
      { id: 'chant', name: 'Ember Chant', actions: [{ type: 'status', status: 'strength', amount: 1, target: 'allAllies', side: 'enemy' }] },
      { id: 'smite', name: 'Censer Swing', actions: [{ type: 'attack', amount: 5, target: 'random' }] },
    ],
    ai: { type: 'cycle', order: ['chant', 'smite', 'smite'] },
  },
  {
    id: 'slag_golem', name: 'Slag Golem', blurb: 'Too hot to touch, too heavy to stop.', kind: 'normal', act: 3, hp: 36,
    startStatuses: { thorns: 2 },
    passiveText: 'Thorns 2: every die that hits it deals 2 damage back to the hero who rolled it.',
    moves: [
      { id: 'smolder', name: 'Smolder', actions: [{ type: 'shield', amount: 5, target: 'self' }, { type: 'attack', amount: 3, target: 'front' }] },
      { id: 'smash', name: 'Molten Smash', actions: [{ type: 'attack', amount: 9, target: 'front' }] },
    ],
    ai: { type: 'cycle', order: ['smolder', 'smash'] },
  },
  {
    id: 'cinder_bat', name: 'Cinder Bat', blurb: 'Swoops off with a reroll in its teeth.', kind: 'normal', act: 3, hp: 13,
    moves: [
      { id: 'swipe', name: 'Swipe', actions: [{ type: 'stealReroll', amount: 1 }, { type: 'attack', amount: 3, target: 'random' }] },
      { id: 'dive', name: 'Dive', actions: [{ type: 'attack', amount: 6, target: 'lowestHp' }] },
    ],
    ai: { type: 'cycle', order: ['swipe', 'dive'] },
  },
  {
    id: 'forge_smith', name: 'Forge Smith', blurb: 'Hammers armour onto its friends mid-fight.', kind: 'normal', act: 3, hp: 24,
    moves: [
      { id: 'plate', name: 'Hot Plating', actions: [{ type: 'shield', amount: 6, target: 'allAllies' }] },
      { id: 'hammer', name: 'Hammer Blow', actions: [{ type: 'attack', amount: 7, target: 'front' }] },
    ],
    ai: { type: 'cycle', order: ['plate', 'hammer'] },
  },
  {
    id: 'chain_warden', name: 'Chain Warden', blurb: 'Has a shackle for every die you own.', kind: 'normal', act: 3, hp: 26,
    moves: [
      { id: 'shackle', name: 'Shackle', actions: [{ type: 'lockDie', target: 'highestHp' }, { type: 'attack', amount: 4, target: 'front' }] },
      { id: 'flail', name: 'Chain Flail', actions: [{ type: 'attack', amount: 4, target: 'random', hits: 2 }] },
    ],
    ai: { type: 'cycle', order: ['shackle', 'flail'] },
  },
  {
    id: 'soot_hexer', name: 'Soot Hexer', blurb: 'Rubs your best face out with a sooty thumb.', kind: 'normal', act: 3, hp: 18,
    moves: [
      { id: 'smudge', name: 'Smudge', actions: [{ type: 'curseFace', target: 'random', face: 'highest' }, { type: 'attack', amount: 3, target: 'random' }] },
      { id: 'bolt', name: 'Soot Bolt', actions: [{ type: 'attack', amount: 7, target: 'lowestHp' }] },
    ],
    ai: { type: 'cycle', order: ['smudge', 'bolt'] },
  },
  {
    id: 'obsidian_knight', name: 'Obsidian Knight', blurb: 'Raises its guard, picks the weakest, and does not miss.', kind: 'elite', act: 3, hp: 68, gold: 8,
    moves: [
      { id: 'wall', name: 'Glass Wall', actions: [{ type: 'charge' }, { type: 'shield', amount: 12, target: 'self' }] },
      { id: 'execute', name: 'Execution Strike', actions: [{ type: 'attack', amount: 15, target: 'lowestHp' }] },
      { id: 'sweep', name: 'Jagged Sweep', actions: [{ type: 'attack', amount: 6, target: 'all' }] },
    ],
    ai: { type: 'cycle', order: ['wall', 'execute', 'sweep'] },
  },
  {
    id: 'pip_eater', name: 'The Pip Eater', blurb: 'It has eaten every die it ever met. Yours are next.', kind: 'boss', act: 3, hp: 130,
    passiveText: 'Pip Hunger: when you end your turn, the Pip Eater gains 1 Strength for every blank or cursed face your dice are showing, '
      + 'for the rest of the fight. It curses your faces to blank as it goes, so reroll blanks away before you end the turn.',
    passives: [{ trigger: 'turnEnd', effects: [{ type: 'status', target: 'self', status: 'strength', amount: { scale: 'blanksShowing', factor: 1 } }] }],
    moves: [
      { id: 'gnaw', name: 'Gnaw Pips', actions: [{ type: 'curseFace', target: 'random', face: 'highest' }, { type: 'attack', amount: 5, target: 'front' }] },
      { id: 'sweep', name: 'Tail Sweep', actions: [{ type: 'attack', amount: 5, target: 'all' }] },
      { id: 'gorge', name: 'Gorge', actions: [{ type: 'curseFace', target: 'all', face: 'random' }, { type: 'attack', amount: 3, target: 'lowestHp' }] },
      { id: 'flame', name: 'Hoard Flame', actions: [{ type: 'attack', amount: 8, target: 'highestHp' }] },
    ],
    ai: { type: 'cycle', order: ['gnaw', 'sweep', 'gorge', 'flame'] },
  },
]);
