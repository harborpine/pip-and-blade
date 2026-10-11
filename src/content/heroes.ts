import type { HeroDef } from '@shared';
import { blank, face } from './helpers';

export const heroes: HeroDef[] = [
  {
    id: 'bulwark', name: 'Tamsin', title: 'the Bulwark', blurb: 'Stands in front and makes sure nobody else has to.', maxHp: 20, itemSlots: 2, starter: true,
    faces: [
      face('bulwark.raise', 'Raise Shield', 'shield', 'guard', 3),
      face('bulwark.wall', 'Shield Wall', 'shield', 'guard', 2, ['cleave']),
      face('bulwark.brace', 'Brace', 'shield', 'guard', 2, ['ward']),
      face('bulwark.bash', 'Mace Bash', 'damage', 'guard', 3),
      face('bulwark.shove', 'Shove', 'weaken', 'spark', 2),
      blank('bulwark.blank', 'Catch Breath'),
    ],
  },
  {
    id: 'duelist', name: 'Rook', title: 'the Duelist', blurb: 'One clean hit is worth three clumsy ones.', maxHp: 19, itemSlots: 2, starter: true,
    faces: [
      face('duelist.lunge', 'Lunge', 'damage', 'blade', 7),
      face('duelist.thrust', 'Thrust', 'damage', 'blade', 5, ['pierce']),
      face('duelist.flourish', 'Flourish', 'damage', 'blade', 4, ['poised']),
      face('duelist.slash', 'Slash', 'damage', 'blade', 5),
      face('duelist.parry', 'Parry', 'shield', 'guard', 4),
      blank('duelist.blank', 'Misstep'),
    ],
  },
  {
    id: 'herbalist', name: 'Odalie', title: 'the Herbalist', blurb: 'Knows which leaves mend and which ones do the other thing.', maxHp: 14, itemSlots: 2, starter: true,
    faces: [
      face('herbalist.poultice', 'Poultice', 'heal', 'heart', 3),
      face('herbalist.tonic', 'Tonic', 'heal', 'heart', 2, ['cleave']),
      face('herbalist.nightshade', 'Nightshade', 'damage', 'heart', 3, ['venom']),
      face('herbalist.sickle', 'Sickle', 'damage', 'blade', 3),
      face('herbalist.study', 'Study', 'focus', 'spark', 1),
      blank('herbalist.blank', 'Empty Pouch'),
    ],
  },
  {
    id: 'gambler', name: 'Sixpence', title: 'the Gambler', blurb: 'Never happy with the first roll. Rarely wrong about that.', maxHp: 17, itemSlots: 2, starter: false,
    faces: [
      face('gambler.ace', 'Ace Up', 'damage', 'spark', 4, ['momentum']),
      face('gambler.wild', 'Wild Card', 'damage', 'spark', 2, ['twin']),
      face('gambler.hedge', 'Hedge', 'shield', 'guard', 3, ['momentum']),
      face('gambler.shuffle', 'Shuffle', 'focus', 'spark', 2),
      face('gambler.marked', 'Marked Card', 'weaken', 'spark', 3, ['momentum']),
      blank('gambler.blank', 'Bust'),
    ],
  },
  {
    id: 'redhand', name: 'Hroda', title: 'Redhand', blurb: 'Pays for every swing in her own blood and calls it a bargain.', maxHp: 20, itemSlots: 2, starter: false,
    faces: [
      face('redhand.swing', 'Wild Swing', 'damage', 'blade', 9, ['reckless']),
      face('redhand.hack', 'Hack', 'damage', 'blade', 5),
      face('redhand.split', 'Skullsplitter', 'damage', 'skull', 5, ['execute']),
      face('redhand.whirl', 'Whirl', 'damage', 'spark', 3, ['cleave']),
      face('redhand.grit', 'Grit', 'shield', 'guard', 4),
      blank('redhand.blank', 'Overreach'),
    ],
  },
  {
    id: 'automaton', name: 'Brasswick', title: 'the Automaton', blurb: 'Watches what works, then does it again, louder.', maxHp: 15, itemSlots: 2, starter: false,
    faces: [
      face('automaton.mimic', 'Mimic Gear', 'damage', 'spark', 0, ['echo']),
      face('automaton.resonator', 'Resonator', 'damage', 'spark', 0, ['echo']),
      face('automaton.piston', 'Piston', 'damage', 'blade', 2, ['twin']),
      face('automaton.rivet', 'Rivet', 'damage', 'blade', 4),
      face('automaton.plating', 'Plating', 'shield', 'guard', 2, ['twin']),
      blank('automaton.blank', 'Wind Down'),
    ],
  },
  {
    id: 'grower', name: 'Mossback', title: 'the Grower', blurb: 'In no hurry at all. Everything it plants gets bigger.', maxHp: 18, itemSlots: 2, starter: false,
    faces: [
      face('grower.sprout', 'Sprout', 'damage', 'heart', 4, ['growth']),
      face('grower.roots', 'Deep Roots', 'shield', 'guard', 4, ['growth']),
      face('grower.sunbeam', 'Sunbeam', 'heal', 'heart', 2, ['growth', 'cleave']),
      face('grower.bloom', 'Bloom', 'damage', 'spark', 3, ['rally']),
      face('grower.lash', 'Vine Lash', 'damage', 'blade', 4),
      blank('grower.blank', 'Doze'),
    ],
  },
  {
    id: 'hexer', name: 'Vesper', title: 'the Hexer', blurb: 'Deals in bad luck. Mostly other people\'s.', maxHp: 15, itemSlots: 2, starter: false,
    faces: [
      face('hexer.hex', 'Hex', 'weaken', 'skull', 4),
      face('hexer.wither', 'Wither', 'damage', 'skull', 3, ['venom']),
      face('hexer.bolt', 'Curse Bolt', 'damage', 'skull', 5),
      face('hexer.dread', 'Dread', 'weaken', 'skull', 2, ['cleave']),
      blank('hexer.blank1', 'Empty Palm'),
      blank('hexer.blank2', 'Hollow Stare'),
    ],
  },
];
