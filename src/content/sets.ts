/** Sets (matching symbols when rolling ends) and the six kinds of door. */
import type { DoorDef, SetDef } from '@shared';

export const sets: SetDef[] = [
  { kind: 'pair', name: 'Pair', text: 'Two dice share a symbol: each of them gets +1.', dieBonus: 1 },
  { kind: 'triple', name: 'Triple', text: 'Three dice share a symbol: each of them gets +2.', dieBonus: 2 },
  {
    kind: 'triple', symbol: 'blade', name: 'Triple Blades',
    text: 'Three Blades: each die gets +2 and every enemy takes 4 damage.',
    dieBonus: 2, burst: [{ type: 'damage', target: 'allEnemies', amount: 4 }],
  },
  {
    kind: 'triple', symbol: 'guard', name: 'Triple Guards',
    text: 'Three Guards: each die gets +2 and every hero gains 5 shield.',
    dieBonus: 2, burst: [{ type: 'shield', target: 'allHeroes', amount: 5 }],
  },
  {
    kind: 'triple', symbol: 'heart', name: 'Triple Hearts',
    text: 'Three Hearts: each die gets +2 and every hero heals 4 HP.',
    dieBonus: 2, burst: [{ type: 'heal', target: 'allHeroes', amount: 4 }],
  },
  {
    kind: 'triple', symbol: 'spark', name: 'Triple Sparks',
    text: 'Three Sparks: each die gets +2 and you get 2 extra rerolls next turn.',
    dieBonus: 2, burst: [{ type: 'rerolls', amount: 2, when: 'nextTurn' }],
  },
  {
    kind: 'triple', symbol: 'skull', name: 'Triple Skulls',
    text: 'Three Skulls: each die gets +2 and every enemy gains 2 Poison.',
    dieBonus: 2, burst: [{ type: 'status', target: 'allEnemies', status: 'poison', amount: 2 }],
  },
  { kind: 'rainbow', name: 'Rainbow', text: 'Three different symbols (needs the Rainbow Prism): each die gets +1.', dieBonus: 1 },
];

export const doors: DoorDef[] = [
  { kind: 'elite', name: 'The Hard Way', text: 'The next fight is a much tougher elite. It pays more gold and gives two reward picks with better odds of rare finds.', weight: [2, 3, 3] },
  { kind: 'rest', name: 'Campfire', text: 'Heal every hero for 35% of their max HP, or upgrade one die face by +1.', weight: [4, 4, 4] },
  { kind: 'shop', name: 'Pedlar', text: 'Spend gold on items, new faces, an upgrade or a heal.', weight: [3, 4, 4] },
  { kind: 'event', name: 'Something Odd', text: 'A strange meeting. Every choice tells you what it does before you pick.', weight: [4, 4, 4] },
  { kind: 'treasure', name: 'Glint of Gold', text: 'Take one of three items for free.', weight: [2, 2, 2] },
  { kind: 'onward', name: 'Press On', text: 'Nothing happens. Straight to the next fight.', weight: [2, 2, 2] },
];
