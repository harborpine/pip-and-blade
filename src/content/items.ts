/** The 40 items: 28 in the base pool, 12 that join it when their feat is done. */
import type { ItemDef } from '@shared';

const base: ItemDef[] = [
  {
    id: 'whetstone', name: 'Whetstone', rarity: 'common', locked: false,
    text: "The owner's damage faces get +1.",
    modifiers: [{ type: 'faceValue', amount: 1, filter: { effect: ['damage'] }, scope: 'owner' }],
  },
  {
    id: 'oak_buckler', name: 'Oak Buckler', rarity: 'common', locked: false,
    text: 'At the start of each fight the owner gains 5 shield. It lasts through the first enemy turn.',
    triggers: [{ trigger: 'fightStart', effects: [{ type: 'shield', target: 'owner', amount: 5 }] }],
  },
  {
    id: 'healers_satchel', name: "Healer's Satchel", rarity: 'common', locked: false,
    text: "Every hero's healing faces get +1.",
    modifiers: [{ type: 'faceValue', amount: 1, filter: { effect: ['heal'] }, scope: 'party' }],
  },
  {
    id: 'lucky_coin', name: 'Lucky Coin', rarity: 'common', locked: false,
    text: 'You get 1 extra reroll on the first turn of each fight.',
    modifiers: [{ type: 'rerolls', amount: 1, firstTurnOnly: true }],
  },
  {
    id: 'hollow_die', name: 'Hollow Die', rarity: 'common', locked: false,
    text: "Every hero's blank faces (including cursed faces) deal 4 damage to one enemy.",
    modifiers: [{ type: 'blankAs', effect: 'damage', value: 4 }],
  },
  {
    id: 'loaded_pip', name: 'Loaded Pip', rarity: 'uncommon', locked: false,
    text: 'Any die that was rerolled at least once this turn gets +1.',
    modifiers: [{ type: 'rerolledBonus', amount: 1, scope: 'party' }],
  },
  {
    id: 'first_pick_glove', name: 'First-Pick Glove', rarity: 'rare', locked: false,
    text: 'The first die you lock each turn is worth half as much again (x1.5, rounded down) for that turn, even if you unlock it again.',
    modifiers: [{ type: 'firstLockMultiplier', factor: 1.5 }],
  },
  {
    id: 'thorn_mail', name: 'Thorn Mail', rarity: 'common', locked: false,
    text: 'The owner has 3 Thorns: each enemy hit on the owner deals 3 damage back to the attacker.',
    modifiers: [{ type: 'startStatus', status: 'thorns', amount: 3 }],
  },
  {
    id: 'venom_vial', name: 'Venom Vial', rarity: 'common', locked: false,
    text: 'Whenever your party applies Poison, it applies 1 more.',
    modifiers: [{ type: 'statusPotency', status: 'poison', amount: 1 }],
  },
  {
    id: 'twin_charm', name: 'Twin Charm', rarity: 'common', locked: false,
    text: 'Each die in a pair gets an extra +2 (so +3 in total).',
    modifiers: [{ type: 'setBonus', amount: 2, kind: 'pair' }],
  },
  {
    id: 'crown_of_three', name: 'Crown of Three', rarity: 'uncommon', locked: false,
    text: 'Triple bursts are doubled, and each die in a triple gets an extra +2 (so +4 in total).',
    modifiers: [{ type: 'tripleBurstMultiplier', factor: 2 }, { type: 'setBonus', amount: 2, kind: 'triple' }],
  },
  {
    id: 'patient_hourglass', name: 'Patient Hourglass', rarity: 'common', locked: false,
    text: 'When you end your turn, the owner gains 3 shield for each reroll you did not use.',
    triggers: [{ trigger: 'turnEnd', effects: [{ type: 'shield', target: 'owner', amount: { scale: 'rerollsLeft', factor: 3 } }] }],
  },
  {
    id: 'gamblers_ante', name: "Gambler's Ante", rarity: 'uncommon', locked: false,
    text: 'You get 1 extra reroll every turn. The owner has 3 less max HP.',
    modifiers: [{ type: 'rerolls', amount: 1 }, { type: 'maxHp', amount: -3 }],
  },
  {
    id: 'iron_ration', name: 'Iron Ration', rarity: 'common', locked: false,
    text: 'The owner has 8 more max HP.',
    modifiers: [{ type: 'maxHp', amount: 8 }],
  },
  {
    id: 'seedling_pot', name: 'Seedling Pot', rarity: 'uncommon', locked: false,
    text: 'Growth faces gain 2 more each time they are used (so +4 per use).',
    modifiers: [{ type: 'growthStep', amount: 2 }],
  },
  {
    id: 'red_bandana', name: 'Red Bandana', rarity: 'common', locked: false,
    text: "While the owner is at or below half HP, the owner's damage faces get +3.",
    modifiers: [{ type: 'faceValue', amount: 3, filter: { effect: ['damage'] }, scope: 'owner', hpAtMostPct: 50 }],
  },
  {
    id: 'mirror_shard', name: 'Mirror Shard', rarity: 'uncommon', locked: false,
    text: "The owner's die counts as whichever symbol makes the best set, whatever it shows.",
    modifiers: [{ type: 'wildSymbol' }],
  },
  {
    id: 'ward_stone', name: 'Ward Stone', rarity: 'uncommon', locked: false,
    text: "The owner's shield no longer expires at the start of your turn.",
    modifiers: [{ type: 'shieldPersists', scope: 'owner' }],
  },
  {
    id: 'bone_charm', name: 'Bone Charm', rarity: 'common', locked: false,
    text: "Enemies cannot curse the owner's die faces, and the owner has 3 more max HP.",
    modifiers: [{ type: 'trickImmune', tricks: ['curseFace'], scope: 'owner' }, { type: 'maxHp', amount: 3 }],
  },
  {
    id: 'unjam_oil', name: 'Unjam Oil', rarity: 'common', locked: false,
    text: "Enemies cannot jam your party's dice.",
    modifiers: [{ type: 'trickImmune', tricks: ['lockDie'], scope: 'party' }],
  },
  {
    id: 'purse_string', name: 'Purse String', rarity: 'common', locked: false,
    text: 'Enemies cannot steal your rerolls, and you gain 25% more gold.',
    modifiers: [{ type: 'trickImmune', tricks: ['stealReroll'], scope: 'party' }, { type: 'goldGainPct', amount: 25 }],
  },
  {
    id: 'spiked_pommel', name: 'Spiked Pommel', rarity: 'uncommon', locked: false,
    text: 'Whenever the owner uses a shield face, the front enemy takes damage equal to that face\'s value.',
    triggers: [{
      trigger: 'dieUsed',
      condition: { type: 'all', of: [{ type: 'ownerDie' }, { type: 'face', filter: { effect: ['shield'] } }] },
      effects: [{ type: 'damage', target: 'frontEnemy', amount: { scale: 'triggerValue', factor: 1 } }],
    }],
  },
  {
    id: 'leech_fang', name: 'Leech Fang', rarity: 'uncommon', locked: false,
    text: 'Whenever the owner uses a damage face, the owner heals 2 HP.',
    triggers: [{
      trigger: 'dieUsed',
      condition: { type: 'all', of: [{ type: 'ownerDie' }, { type: 'face', filter: { effect: ['damage'] } }] },
      effects: [{ type: 'heal', target: 'owner', amount: 2 }],
    }],
  },
  {
    id: 'battle_drum', name: 'Battle Drum', rarity: 'common', locked: false,
    text: 'The first die you use each turn gets +1.',
    triggers: [
      { trigger: 'rollEnd', effects: [{ type: 'dieBonus', dice: 'allDice', amount: 1 }] },
      { trigger: 'dieUsed', condition: { type: 'diceUsed', op: '==', value: 1 }, effects: [{ type: 'dieBonus', dice: 'otherDice', amount: -1 }] },
    ],
  },
  {
    id: 'last_word', name: 'Last Word', rarity: 'common', locked: false,
    text: 'The last die you use each turn gets +1 (the one left when every other die has been used).',
    triggers: [
      { trigger: 'rollEnd', condition: { type: 'unusedDice', op: '==', value: 1 }, effects: [{ type: 'dieBonus', dice: 'allDice', amount: 1 }] },
      { trigger: 'dieUsed', condition: { type: 'unusedDice', op: '==', value: 1 }, effects: [{ type: 'dieBonus', dice: 'otherDice', amount: 1 }] },
    ],
  },
  {
    id: 'cleaver_hook', name: 'Cleaver Hook', rarity: 'uncommon', locked: false,
    text: "The owner's damage faces get -1 and gain Cleave: they hit every enemy.",
    modifiers: [
      { type: 'grantKeyword', keyword: 'cleave', filter: { effect: ['damage'] }, scope: 'owner' },
      { type: 'faceValue', amount: -1, filter: { effect: ['damage'] }, scope: 'owner' },
    ],
  },
  {
    id: 'field_medic_kit', name: 'Field Medic Kit', rarity: 'common', locked: false,
    text: 'Downed heroes return with 25% more of their max HP, and every living hero heals 2 HP after each fight you win.',
    modifiers: [{ type: 'returnHpPct', amount: 25 }, { type: 'healAfterFight', amount: 2 }],
  },
  {
    id: 'merchants_scale', name: "Merchant's Scale", rarity: 'common', locked: false,
    text: 'Everything in shops costs 50% less.',
    modifiers: [{ type: 'shopDiscountPct', amount: 50 }],
  },
];

const unlockable: ItemDef[] = [
  {
    id: 'void_pip', name: 'Void Pip', rarity: 'uncommon', locked: true,
    text: "Every hero's blank faces (including cursed faces) give 3 shield to each of your heroes.",
    modifiers: [{ type: 'blankAs', effect: 'shield', value: 3, cleave: true }],
  },
  {
    id: 'echo_bell', name: 'Echo Bell', rarity: 'uncommon', locked: true,
    text: 'Echo faces get +3.',
    modifiers: [{ type: 'faceValue', amount: 3, filter: { keyword: ['echo'] }, scope: 'party' }],
  },
  {
    id: 'reckless_idol', name: 'Reckless Idol', rarity: 'uncommon', locked: true,
    text: 'Reckless faces get +3.',
    modifiers: [{ type: 'faceValue', amount: 3, filter: { keyword: ['reckless'] }, scope: 'party' }],
  },
  {
    id: 'executioners_hood', name: "Executioner's Hood", rarity: 'rare', locked: true,
    text: "The owner's damage faces gain Execute: x2 damage to a target at or below half of its max HP.",
    modifiers: [{ type: 'grantKeyword', keyword: 'execute', filter: { effect: ['damage'] }, scope: 'owner' }],
  },
  {
    id: 'rainbow_prism', name: 'Rainbow Prism', rarity: 'uncommon', locked: true,
    text: 'Three dice showing three different symbols count as a set called a Rainbow: each of them gets +1.',
    modifiers: [{ type: 'enableRainbow' }],
  },
  {
    id: 'pip_magnet', name: 'Pip Magnet', rarity: 'uncommon', locked: true,
    text: 'Once per turn, a reroll that rolls exactly one die costs no reroll.',
    modifiers: [{ type: 'freeSingleReroll', count: 1 }],
  },
  {
    id: 'glass_cannon', name: 'Glass Cannon', rarity: 'rare', locked: true,
    text: "The owner's damage faces get +3. The owner has 5 less max HP.",
    modifiers: [{ type: 'faceValue', amount: 3, filter: { effect: ['damage'] }, scope: 'owner' }, { type: 'maxHp', amount: -5 }],
  },
  {
    id: 'tortoise_shell', name: 'Tortoise Shell', rarity: 'uncommon', locked: true,
    text: 'Whenever one of your heroes gains shield, they gain 1 more.',
    modifiers: [{ type: 'shieldGain', amount: 1, scope: 'party' }],
  },
  {
    id: 'plague_censer', name: 'Plague Censer', rarity: 'rare', locked: true,
    text: 'When a poisoned enemy dies, every other enemy gains Poison equal to the Poison it had.',
    triggers: [{
      trigger: 'enemyKilled',
      condition: { type: 'targetHasStatus', status: 'poison' },
      effects: [{ type: 'status', target: 'otherEnemies', status: 'poison', amount: { scale: 'targetStatus', status: 'poison', factor: 1 } }],
    }],
  },
  {
    id: 'double_or_nothing', name: 'Double or Nothing', rarity: 'rare', locked: true,
    text: 'When you form a triple, every die in it resolves twice this turn.',
    triggers: [{ trigger: 'setFormed', condition: { type: 'set', kind: 'triple' }, effects: [{ type: 'dieRepeat', dice: 'setDice', times: 1 }] }],
  },
  {
    id: 'phoenix_feather', name: 'Phoenix Feather', rarity: 'rare', locked: true,
    text: 'Once per run, when the owner is downed they get straight back up with half of their max HP.',
    triggers: [{ trigger: 'heroDowned', condition: { type: 'ownerInvolved' }, effects: [{ type: 'revive', pct: 50 }], limit: { per: 'run', count: 1 } }],
  },
  {
    id: 'kings_die', name: "King's Die", rarity: 'rare', locked: true,
    text: 'While you have not spent a reroll this turn, every non-blank die face gets +1.',
    modifiers: [{ type: 'faceValue', amount: 1, scope: 'party', noRerollsSpent: true }],
  },
];

export const items: ItemDef[] = [...base, ...unlockable];
