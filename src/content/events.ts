/** Door events. Every choice states exactly what it does before the player picks. */
import type { EventDef } from '@shared';

export const events: EventDef[] = [
  {
    id: 'wishing_well', name: 'The Wishing Well', acts: [1, 2, 3],
    text: 'A mossy well hums quietly. Something at the bottom is listening.',
    choices: [
      { label: 'Toss in a coin', costGold: 8, text: 'Pay 8 gold. Every hero heals 6 HP.', result: 'The water glows. Aches fade.', outcomes: [{ type: 'heal', target: 'all', amount: 6 }] },
      { label: 'Drink deep', text: 'Every hero gains 2 max HP. Your healthiest hero loses 4 HP.', result: 'Cold, bitter, and oddly bracing.', outcomes: [{ type: 'maxHp', target: 'all', amount: 2 }, { type: 'hurt', target: 'highest', amount: 4 }] },
      { label: 'Walk on', text: 'Nothing happens.', result: 'The humming stops as you leave.', outcomes: [{ type: 'nothing' }] },
    ],
  },
  {
    id: 'hollow_shrine', name: 'The Hollow Shrine', acts: [1, 2, 3],
    text: 'An altar holds a grey die with nothing on it. A sign reads: "Give a face, take the die."',
    choices: [
      { label: 'Give a face', text: 'Your lowest-value face becomes a blank. Gain the item Hollow Die (blank faces deal 4 damage).', result: 'One of your faces fades to grey. The die is yours.', outcomes: [{ type: 'blankFace', target: 'lowestValue' }, { type: 'item', item: 'hollow_die' }] },
      { label: 'Kneel a while', text: 'Your most hurt hero heals 6 HP.', result: 'It is quiet here. That helps.', outcomes: [{ type: 'heal', target: 'lowest', amount: 6 }] },
      { label: 'Leave it', text: 'Nothing happens.', result: 'Some bargains are best left on the altar.', outcomes: [{ type: 'nothing' }] },
    ],
  },
  {
    id: 'travelling_smith', name: 'The Travelling Smith', acts: [1, 2, 3],
    text: 'A smith with a cart-mounted anvil offers to rework a die. Her apprentice is very keen to help.',
    choices: [
      { label: 'Pay the smith', costGold: 12, text: 'Pay 12 gold. Upgrade one face of your choice by +1.', result: 'Three clean taps. Better.', outcomes: [{ type: 'upgradeFace', target: 'choose', amount: 1 }] },
      { label: 'Let the apprentice try', text: 'A random face gets +1. A random hero loses 3 HP.', result: 'It works. The hammer also slips.', outcomes: [{ type: 'upgradeFace', target: 'random', amount: 1 }, { type: 'hurt', target: 'random', amount: 3 }] },
      { label: 'No thanks', text: 'Nothing happens.', result: 'The cart rattles away.', outcomes: [{ type: 'nothing' }] },
    ],
  },
  {
    id: 'poisoners_garden', name: "The Poisoner's Garden", acts: [1, 2],
    text: 'Neat rows of very pretty, very deadly flowers. Nobody seems to be home.',
    choices: [
      { label: 'Fill a vial', text: 'Gain the item Venom Vial (your Poison applies 1 more). Every hero loses 2 HP.', result: 'Your eyes water for an hour.', outcomes: [{ type: 'hurt', target: 'all', amount: 2 }, { type: 'item', item: 'venom_vial' }] },
      { label: 'Pick the safe herbs', text: 'Every hero heals 4 HP.', result: 'Odalie would approve.', outcomes: [{ type: 'heal', target: 'all', amount: 4 }] },
    ],
  },
  {
    id: 'tinkers_stall', name: "The Tinker's Stall", acts: [1, 2, 3],
    text: 'A tinker has three odd trinkets on a blanket and will part with exactly one.',
    choices: [
      { label: 'The weighted pip', costGold: 12, text: 'Pay 12 gold. Gain the item Loaded Pip (rerolled dice get +1).', result: 'It rolls a little too well.', outcomes: [{ type: 'item', item: 'loaded_pip' }] },
      { label: 'The linked rings', costGold: 10, text: 'Pay 10 gold. Gain the item Twin Charm (pairs give +2 extra).', result: 'They chime when they touch.', outcomes: [{ type: 'item', item: 'twin_charm' }] },
      { label: 'The clay pot', costGold: 12, text: 'Pay 12 gold. Gain the item Seedling Pot (Growth faces grow faster).', result: 'Something in it is already sprouting.', outcomes: [{ type: 'item', item: 'seedling_pot' }] },
      { label: 'Just looking', text: 'Nothing happens.', result: 'The tinker shrugs.', outcomes: [{ type: 'nothing' }] },
    ],
  },
  {
    id: 'forgotten_armory', name: 'The Forgotten Armoury', acts: [1, 2, 3],
    text: 'A rusted rack still holds a few pieces worth taking. The rack is trapped, of course.',
    choices: [
      { label: 'The spiked armour', text: 'Gain the item Thorn Mail (owner has 3 Thorns). A random hero loses 3 HP.', result: 'Snap. Worth it, probably.', outcomes: [{ type: 'hurt', target: 'random', amount: 3 }, { type: 'item', item: 'thorn_mail' }] },
      { label: 'The spiked hilt', text: 'Gain the item Spiked Pommel (owner shield faces also damage the front enemy). A random hero loses 3 HP.', result: 'Snap. Worth it, probably.', outcomes: [{ type: 'hurt', target: 'random', amount: 3 }, { type: 'item', item: 'spiked_pommel' }] },
      { label: 'The red headband', text: 'Gain the item Red Bandana (owner hits harder at half HP). A random hero loses 3 HP.', result: 'Snap. Worth it, probably.', outcomes: [{ type: 'hurt', target: 'random', amount: 3 }, { type: 'item', item: 'red_bandana' }] },
      { label: 'Touch nothing', text: 'Nothing happens.', result: 'The trap stays set for someone else.', outcomes: [{ type: 'nothing' }] },
    ],
  },
  {
    id: 'card_sharp', name: 'The Card Sharp', acts: [1, 2, 3],
    text: 'A stranger shuffles a deck one-handed and nods at the empty seat.',
    choices: [
      { label: 'Buy in', costGold: 15, text: 'Pay 15 gold. Gain an uncommon item.', result: 'You win. You suspect you were allowed to.', outcomes: [{ type: 'item', rarity: 'uncommon' }] },
      { label: 'Take a lesson', text: 'Gain the item Lucky Coin (+1 reroll on the first turn of each fight). A random hero loses 3 max HP.', result: 'The lesson costs more than gold.', outcomes: [{ type: 'maxHp', target: 'random', amount: -3 }, { type: 'item', item: 'lucky_coin' }] },
      { label: 'Keep walking', text: 'Nothing happens.', result: 'The cards keep whispering behind you.', outcomes: [{ type: 'nothing' }] },
    ],
  },
  {
    id: 'stuck_cart', name: 'The Stuck Cart', acts: [1],
    text: 'A farmer\'s cart is axle-deep in mud. He looks at your party hopefully.',
    choices: [
      { label: 'Help push', text: 'Gain 15 gold. Every hero loses 2 HP.', result: 'Muddy, sore, and a little richer.', outcomes: [{ type: 'gold', amount: 15 }, { type: 'hurt', target: 'all', amount: 2 }] },
      { label: 'Rest in the shade', text: 'Every hero heals 3 HP.', result: 'The farmer sighs and keeps pushing.', outcomes: [{ type: 'heal', target: 'all', amount: 3 }] },
    ],
  },
  {
    id: 'old_veteran', name: 'The Old Veteran', acts: [1, 2],
    text: 'A grey soldier watches you practise and winces. "Want to learn it properly?"',
    choices: [
      { label: 'Train hard', text: 'Upgrade one face of your choice by +1. Your healthiest hero loses 4 HP.', result: 'Bruises fade. The lesson stays.', outcomes: [{ type: 'hurt', target: 'highest', amount: 4 }, { type: 'upgradeFace', target: 'choose', amount: 1 }] },
      { label: 'Share a meal', text: 'Gain the item Iron Ration (owner has 8 more max HP).', result: 'He hands over a dented tin and a nod.', outcomes: [{ type: 'item', item: 'iron_ration' }] },
    ],
  },
  {
    id: 'mirror_pool', name: 'The Mirror Pool', acts: [2, 3],
    text: 'Still black water shows your dice with different faces than the ones you carry.',
    choices: [
      { label: 'Reach in', text: 'Gain the item Mirror Shard (owner\'s die is wild for sets). A random face becomes a blank.', result: 'You pull out a shard. Something else stays behind.', outcomes: [{ type: 'blankFace', target: 'random' }, { type: 'item', item: 'mirror_shard' }] },
      { label: 'Study the reflection', text: 'Choose one of three rare faces to put on a die.', result: 'You remember what you saw.', outcomes: [{ type: 'rewardFace', rarity: 'rare' }] },
      { label: 'Step back', text: 'Nothing happens.', result: 'The water goes dark.', outcomes: [{ type: 'nothing' }] },
    ],
  },
  {
    id: 'drowned_cache', name: 'The Drowned Cache', acts: [2],
    text: 'A strongbox sits under two fathoms of cold, moving water.',
    choices: [
      { label: 'Dive for it', text: 'Gain 25 gold. Your healthiest hero loses 6 HP.', result: 'Heavy, cold, and worth it.', outcomes: [{ type: 'gold', amount: 25 }, { type: 'hurt', target: 'highest', amount: 6 }] },
      { label: 'Fish from the bank', text: 'Gain 8 gold.', result: 'A few coins come up on the hook.', outcomes: [{ type: 'gold', amount: 8 }] },
    ],
  },
  {
    id: 'bone_reader', name: 'The Bone Reader', acts: [2, 3],
    text: 'A masked figure rattles a cup of knuckle bones. "Gold or blood. Either reads true."',
    choices: [
      { label: 'Pay in gold', costGold: 22, text: 'Pay 22 gold. Gain a rare item.', result: 'The bones land in a pattern you like.', outcomes: [{ type: 'item', rarity: 'rare' }] },
      { label: 'Pay in blood', text: 'Every hero loses 3 HP. Choose one of three uncommon faces to put on a die.', result: 'The bones drink. A new face settles on your die.', outcomes: [{ type: 'hurt', target: 'all', amount: 3 }, { type: 'rewardFace', rarity: 'uncommon' }] },
      { label: 'Decline', text: 'Nothing happens.', result: '"Another time," the mask says.', outcomes: [{ type: 'nothing' }] },
    ],
  },
  {
    id: 'ember_altar', name: 'The Ember Altar', acts: [3],
    text: 'A brazier burns with no fuel. The heat feels like it is asking for something.',
    choices: [
      { label: 'Burn a face', text: 'Your lowest-value face becomes a blank. Every hero gains 4 max HP.', result: 'The die smokes. Everyone stands a little taller.', outcomes: [{ type: 'blankFace', target: 'lowestValue' }, { type: 'maxHp', target: 'all', amount: 4 }] },
      { label: 'Warm your hands', text: 'Every hero heals 5 HP.', result: 'For a moment the Spire feels almost kind.', outcomes: [{ type: 'heal', target: 'all', amount: 5 }] },
    ],
  },
];
