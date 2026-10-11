/**
 * Small hand-made ContentDBs for engine tests. Engine tests never import src/content, so
 * balance changes cannot break them. Ids come from the shared roster (the types require it),
 * but every number and behaviour here is a test fixture.
 */
import type {
  ContentDB, EnemyAction, EnemyDef, EnemyId, FaceDef, FaceEffect, HeroDef, HeroId, ItemDef, ItemId, KeywordId, MoveDef, RewardFaceDef,
  SymbolId,
} from '@shared';

const DEFAULT_SYMBOL: Record<FaceEffect, SymbolId | null> = { damage: 'blade', shield: 'guard', heal: 'heart', weaken: 'spark', focus: 'spark', blank: null };

let faceSeq = 0;
/** A face definition. The symbol defaults by effect (damage = blade, shield = guard, heal = heart, weaken / focus = spark). */
export function face(effect: FaceEffect, value = 0, keywords: KeywordId[] = [], symbol: SymbolId | null = DEFAULT_SYMBOL[effect]): FaceDef {
  return { id: `f${faceSeq++}.${effect}`, name: effect, effect, symbol: effect === 'blank' ? null : symbol, value: effect === 'blank' ? 0 : value, keywords };
}

/** A hero. Pass one face to get a die with six identical faces, so rolls are irrelevant. */
export function hero(id: HeroId, faces: FaceDef | FaceDef[], maxHp = 20, starter = true): HeroDef {
  const six = Array.isArray(faces) ? faces : [0, 1, 2, 3, 4, 5].map(() => ({ ...faces, keywords: faces.keywords.slice() }));
  return { id, name: id, title: '', blurb: '', maxHp, faces: six, itemSlots: 2, starter };
}

export function move(id: string, ...actions: EnemyAction[]): MoveDef {
  return { id, name: id, actions };
}

/** An enemy that cycles through the given moves (a bare action list is one move). */
export function enemy(id: EnemyId, hp: number, moves: MoveDef[] | EnemyAction[] = [{ type: 'charge' }], extra: Partial<EnemyDef> = {}): EnemyDef {
  const first = moves[0];
  const list: MoveDef[] = first && 'actions' in first ? (moves as MoveDef[]) : [move('m', ...(moves as EnemyAction[]))];
  return { id, name: id, blurb: '', kind: 'normal', act: 1, hp, moves: list, ai: { type: 'cycle', order: list.map((m) => m.id) }, ...extra };
}

export function item(id: ItemId, parts: Partial<ItemDef> = {}): ItemDef {
  return { id, name: id, text: '', rarity: 'common', locked: false, ...parts };
}

export function rewardFace(id: string, effect: FaceEffect, value: number, rarity: RewardFaceDef['rarity'] = 'common', keywords: KeywordId[] = [], heroes: RewardFaceDef['heroes'] = 'any'): RewardFaceDef {
  return { id, name: id, effect, symbol: DEFAULT_SYMBOL[effect], value, keywords, rarity, heroes };
}

/** A minimal, valid ContentDB: three uniform heroes and one passive punching-bag enemy. Override any part. */
export function content(over: Partial<ContentDB> = {}): ContentDB {
  return {
    rules: {
      partySize: 3, rerollsPerTurn: 2, maxEnemies: 4, downedReturnHpPct: 50, maxUpgradesPerFace: 2, upgradeAmount: 1,
      goldPerFight: [10, 20, 30],
      rarityWeights: {
        normal: [[70, 25, 5], [60, 30, 10], [50, 35, 15]],
        elite: [[30, 50, 20], [30, 50, 20], [30, 50, 20]],
        boss: [[0, 50, 50], [0, 50, 50], [0, 50, 50]],
      },
      restHealPct: 40,
      shop: { itemPrice: { common: 10, uncommon: 20, rare: 30 }, facePrice: { common: 8, uncommon: 12, rare: 20 }, upgradePrice: 10, healPrice: 5, healPct: 30, itemsOffered: 3, facesOffered: 2 },
      treasureChoices: 3, eliteRewardPicks: 2, bossHealPct: 30,
      dailyScore: { perFightWon: 100, perBossWon: 250, winBonus: 1000, perHpLeft: 5 },
    },
    keywords: [
      { id: 'cleave', name: 'Cleave', text: '', param: 0 }, { id: 'echo', name: 'Echo', text: '', param: 0 },
      { id: 'growth', name: 'Growth', text: '', param: 1 }, { id: 'reckless', name: 'Reckless', text: '', param: 2 },
      { id: 'pierce', name: 'Pierce', text: '', param: 0 }, { id: 'venom', name: 'Venom', text: '', param: 0 },
      { id: 'ward', name: 'Ward', text: '', param: 0 }, { id: 'twin', name: 'Twin', text: '', param: 0 },
      { id: 'rally', name: 'Rally', text: '', param: 1 }, { id: 'momentum', name: 'Momentum', text: '', param: 1 },
      { id: 'poised', name: 'Poised', text: '', param: 2 }, { id: 'execute', name: 'Execute', text: '', param: 2 },
    ],
    statuses: [
      { id: 'poison', name: 'Poison', text: '' }, { id: 'weak', name: 'Weak', text: '' }, { id: 'strength', name: 'Strength', text: '' },
      { id: 'thorns', name: 'Thorns', text: '' }, { id: 'regen', name: 'Regen', text: '' }, { id: 'mark', name: 'Mark', text: '' },
    ],
    heroes: [hero('bulwark', face('shield', 2)), hero('duelist', face('damage', 3)), hero('herbalist', face('heal', 2))],
    rewardFaces: [],
    items: [],
    enemies: [enemy('gnaw_rat', 30)],
    encounters: [{ id: 'e1', act: 1, kind: 'normal', enemies: ['gnaw_rat'] }],
    sets: [],
    doors: [
      { kind: 'elite', name: 'elite', text: '', weight: [1, 1, 1] }, { kind: 'rest', name: 'rest', text: '', weight: [1, 1, 1] },
      { kind: 'shop', name: 'shop', text: '', weight: [1, 1, 1] }, { kind: 'event', name: 'event', text: '', weight: [1, 1, 1] },
      { kind: 'treasure', name: 'treasure', text: '', weight: [1, 1, 1] }, { kind: 'onward', name: 'onward', text: '', weight: [1, 1, 1] },
    ],
    events: [],
    tiers: [],
    feats: [],
    tutorial: { seed: 'tutorial', heroes: ['bulwark', 'duelist', 'herbalist'], encounter: { id: 'tutorial', act: 1, kind: 'normal', slots: [1], enemies: ['gnaw_rat'] } },
    ...over,
  };
}

/** The standard set rules used by set tests: pair +1, triple +2 (blade triple also bursts 2 to all enemies), rainbow +1. */
export const SETS: ContentDB['sets'] = [
  { kind: 'pair', name: 'Pair', text: '', dieBonus: 1 },
  { kind: 'triple', name: 'Triple', text: '', dieBonus: 2 },
  { kind: 'triple', symbol: 'blade', name: 'Triple Blades', text: '', dieBonus: 2, burst: [{ type: 'damage', target: 'allEnemies', amount: 2 }] },
  { kind: 'triple', symbol: 'guard', name: 'Triple Guards', text: '', dieBonus: 2, burst: [{ type: 'shield', target: 'allHeroes', amount: 2 }] },
  { kind: 'rainbow', name: 'Rainbow', text: '', dieBonus: 1 },
];

/**
 * A broad content set for run-structure and fuzz tests: mixed dice, every keyword, items covering every
 * modifier and effect type, enemies covering every action, phases, passives, three acts with elites and
 * bosses, events with every outcome, five tiers and a handful of feats.
 */
export function fullContent(): ContentDB {
  const heroes: HeroDef[] = [
    hero('bulwark', [face('shield', 3), face('shield', 2, ['cleave']), face('shield', 2, ['ward']), face('damage', 3), face('weaken', 2), face('blank')], 16),
    hero('duelist', [face('damage', 4), face('damage', 3, ['pierce']), face('damage', 2, ['poised']), face('damage', 3, ['execute']), face('shield', 2), face('blank')], 12),
    hero('herbalist', [face('heal', 3), face('heal', 2, ['cleave']), face('damage', 2, ['venom'], 'skull'), face('damage', 2), face('focus', 1), face('blank')], 11),
    hero('gambler', [face('damage', 2, ['momentum'], 'spark'), face('damage', 3, [], 'spark'), face('focus', 1), face('shield', 2, ['momentum']), face('damage', 2, ['twin']), face('blank')], 11, false),
    hero('redhand', [face('damage', 6, ['reckless']), face('damage', 4, ['execute']), face('damage', 3, ['cleave']), face('damage', 5, ['reckless', 'cleave']), face('shield', 2), face('blank')], 14, false),
    hero('automaton', [face('damage', 1, ['echo'], 'spark'), face('damage', 2, ['twin']), face('shield', 1, ['echo']), face('damage', 3), face('shield', 2, ['twin']), face('blank')], 12, false),
    hero('grower', [face('damage', 1, ['growth'], 'heart'), face('shield', 1, ['growth']), face('heal', 1, ['rally']), face('damage', 2, ['rally']), face('heal', 2), face('blank')], 13, false),
    hero('hexer', [face('blank'), face('blank'), face('weaken', 3, [], 'skull'), face('damage', 3, ['venom'], 'skull'), face('damage', 2, [], 'skull'), face('weaken', 2, ['cleave'], 'skull')], 10, false),
  ];
  const items: ItemDef[] = [
    item('whetstone', { modifiers: [{ type: 'faceValue', amount: 1, filter: { effect: ['damage'] }, scope: 'owner' }] }),
    item('oak_buckler', { triggers: [{ trigger: 'fightStart', effects: [{ type: 'shield', target: 'owner', amount: 3 }] }] }),
    item('healers_satchel', { modifiers: [{ type: 'faceValue', amount: 1, filter: { effect: ['heal'] }, scope: 'party' }] }),
    item('lucky_coin', { modifiers: [{ type: 'rerolls', amount: 1, firstTurnOnly: true }] }),
    item('hollow_die', { modifiers: [{ type: 'blankAs', effect: 'damage', value: 2 }] }),
    item('loaded_pip', { modifiers: [{ type: 'rerolledBonus', amount: 1, scope: 'party' }] }),
    item('first_pick_glove', { rarity: 'uncommon', modifiers: [{ type: 'firstLockMultiplier', factor: 2 }] }),
    item('thorn_mail', { modifiers: [{ type: 'startStatus', status: 'thorns', amount: 2 }] }),
    item('venom_vial', { modifiers: [{ type: 'statusPotency', status: 'poison', amount: 1 }] }),
    item('twin_charm', { modifiers: [{ type: 'setBonus', amount: 1, kind: 'pair' }] }),
    item('crown_of_three', { rarity: 'uncommon', modifiers: [{ type: 'tripleBurstMultiplier', factor: 2 }] }),
    item('patient_hourglass', { triggers: [{ trigger: 'turnEnd', effects: [{ type: 'shield', target: 'allHeroes', amount: { scale: 'rerollsLeft', factor: 1 } }] }] }),
    item('gamblers_ante', { modifiers: [{ type: 'rerolls', amount: 1 }, { type: 'maxHp', amount: -3 }] }),
    item('iron_ration', { modifiers: [{ type: 'maxHp', amount: 4 }] }),
    item('seedling_pot', { modifiers: [{ type: 'growthStep', amount: 1 }] }),
    item('red_bandana', { modifiers: [{ type: 'faceValue', amount: 2, filter: { effect: ['damage'] }, scope: 'owner', hpAtMostPct: 50 }] }),
    item('mirror_shard', { rarity: 'uncommon', modifiers: [{ type: 'wildSymbol' }] }),
    item('ward_stone', { modifiers: [{ type: 'shieldPersists', scope: 'owner' }] }),
    item('bone_charm', { modifiers: [{ type: 'trickImmune', tricks: ['curseFace'], scope: 'owner' }] }),
    item('unjam_oil', { modifiers: [{ type: 'trickImmune', tricks: ['lockDie'], scope: 'party' }] }),
    item('purse_string', { modifiers: [{ type: 'trickImmune', tricks: ['stealReroll'], scope: 'party' }, { type: 'goldGainPct', amount: 25 }] }),
    item('spiked_pommel', { triggers: [{ trigger: 'dieUsed', condition: { type: 'all', of: [{ type: 'ownerDie' }, { type: 'face', filter: { effect: ['shield'] } }] }, effects: [{ type: 'damage', target: 'frontEnemy', amount: 2 }] }] }),
    item('leech_fang', { triggers: [{ trigger: 'dieUsed', condition: { type: 'all', of: [{ type: 'ownerDie' }, { type: 'face', filter: { effect: ['damage'] } }] }, effects: [{ type: 'heal', target: 'owner', amount: 1 }] }] }),
    item('battle_drum', { triggers: [
      { trigger: 'turnStart', effects: [{ type: 'dieBonus', dice: 'allDice', amount: 2 }] },
      { trigger: 'dieUsed', condition: { type: 'diceUsed', op: '==', value: 1 }, effects: [{ type: 'dieBonus', dice: 'otherDice', amount: -2 }] },
    ] }),
    item('last_word', { triggers: [{ trigger: 'dieUsed', condition: { type: 'not', of: { type: 'allDiceUsed' } }, limit: { per: 'turn', count: 1 }, effects: [{ type: 'dieBonus', dice: 'otherDice', amount: { scale: 'unusedDice', factor: 0, plus: 1 } }] }] }),
    item('cleaver_hook', { rarity: 'uncommon', modifiers: [{ type: 'grantKeyword', keyword: 'cleave', filter: { effect: ['damage'] }, scope: 'owner' }, { type: 'faceValue', amount: -1, filter: { effect: ['damage'] }, scope: 'owner' }] }),
    item('field_medic_kit', { modifiers: [{ type: 'returnHpPct', amount: 25 }, { type: 'healAfterFight', amount: 2 }] }),
    item('merchants_scale', { modifiers: [{ type: 'shopDiscountPct', amount: 20 }] }),
    item('void_pip', { locked: true, rarity: 'rare', modifiers: [{ type: 'blankAs', effect: 'shield', value: 2, cleave: true }] }),
    item('echo_bell', { locked: true, modifiers: [{ type: 'faceValue', amount: 2, filter: { keyword: ['echo'] }, scope: 'party' }] }),
    item('reckless_idol', { locked: true, modifiers: [{ type: 'faceValue', amount: 3, filter: { keyword: ['reckless'] }, scope: 'party' }] }),
    item('executioners_hood', { locked: true, rarity: 'uncommon', modifiers: [{ type: 'grantKeyword', keyword: 'execute', filter: { effect: ['damage'] }, scope: 'owner' }] }),
    item('rainbow_prism', { locked: true, modifiers: [{ type: 'enableRainbow' }] }),
    item('pip_magnet', { locked: true, modifiers: [{ type: 'freeSingleReroll', count: 1 }] }),
    item('glass_cannon', { locked: true, rarity: 'rare', modifiers: [{ type: 'faceValue', amount: 3, filter: { effect: ['damage'] }, scope: 'owner' }, { type: 'maxHp', amount: -4 }] }),
    item('tortoise_shell', { locked: true, modifiers: [{ type: 'shieldGain', amount: 1, scope: 'party' }] }),
    item('plague_censer', { locked: true, rarity: 'rare', triggers: [{ trigger: 'enemyKilled', condition: { type: 'targetHasStatus', status: 'poison' }, effects: [{ type: 'status', target: 'otherEnemies', status: 'poison', amount: { scale: 'targetStatus', status: 'poison', factor: 1 } }] }] }),
    item('double_or_nothing', { locked: true, rarity: 'rare', triggers: [{ trigger: 'setFormed', condition: { type: 'set', kind: 'triple' }, effects: [{ type: 'dieRepeat', dice: 'setDice', times: 1 }] }] }),
    item('phoenix_feather', { locked: true, rarity: 'rare', triggers: [{ trigger: 'heroDowned', condition: { type: 'ownerInvolved' }, limit: { per: 'run', count: 1 }, effects: [{ type: 'revive', pct: 50 }] }] }),
    item('kings_die', { locked: true, rarity: 'rare', modifiers: [{ type: 'faceValue', amount: 1, scope: 'party', noRerollsSpent: true }] }),
  ];
  const atk = (amount: number, target: 'front' | 'back' | 'lowestHp' | 'highestHp' | 'random' | 'all' = 'front', extra: Partial<Extract<EnemyAction, { type: 'attack' }>> = {}): EnemyAction => ({ type: 'attack', amount, target, ...extra });
  const enemies: EnemyDef[] = [
    enemy('gnaw_rat', 6, [atk(2)]),
    enemy('bramble_imp', 7, [atk(2, 'random')], { startStatuses: { thorns: 1 } }),
    enemy('mud_slime', 12, [move('gather', { type: 'charge' }, { type: 'shield', amount: 2, target: 'self' }), move('slam', atk(5))]),
    enemy('twig_archer', 7, [atk(3, 'lowestHp')]),
    enemy('mushroom_brute', 9, [atk(1, 'front', { poison: 2 })]),
    enemy('magpie_thief', 6, [move('steal', { type: 'stealReroll', amount: 1 }), move('peck', atk(2, 'back'))]),
    enemy('web_spinner', 8, [move('web', { type: 'lockDie', target: 'random' }), move('bite', atk(2, 'highestHp'))]),
    enemy('hollow_stag', 22, [move('charge', { type: 'charge' }), move('stomp', atk(4, 'all'))], { kind: 'elite' }),
    enemy('bramble_king', 40, [move('stance', { type: 'status', status: 'thorns', amount: 2, target: 'self', side: 'enemy' }, { type: 'summon', enemy: 'bramble_imp', count: 1 }), move('whip', atk(4, 'all'))], {
      kind: 'boss', passiveText: 'x',
      phases: [{ hpAtMostPct: 50, ai: { type: 'weighted', weights: { stance: 1, whip: 2 }, noRepeat: true } }],
    }),
    enemy('drowned_sailor', 16, [atk(5)], { act: 2 }),
    enemy('crab_knight', 18, [move('guard', { type: 'shield', amount: 6, target: 'self' }), move('pinch', atk(7))], { act: 2 }),
    enemy('ink_squid', 12, [move('ink', { type: 'curseFace', target: 'random', face: 'highest' }), move('slap', atk(3, 'random'))], { act: 2 }),
    enemy('barnacle_golem', 26, [move('grow', { type: 'status', status: 'strength', amount: 1, target: 'self', side: 'enemy' }, atk(3))], { act: 2 }),
    enemy('eel_lancer', 13, [atk(3, 'back', { pierce: true })], { act: 2 }),
    enemy('bell_diver', 14, [move('cover', { type: 'shield', amount: 4, target: 'otherAllies' }), move('bonk', atk(4))], { act: 2 }),
    enemy('tide_witch', 12, [move('mend', { type: 'heal', amount: 4, target: 'lowestHpAlly' }), move('hex', { type: 'status', status: 'poison', amount: 2, target: 'all', side: 'hero' })], { act: 2 }),
    enemy('coin_mimic', 14, [move('grab', { type: 'stealReroll', amount: 1 }, atk(3))], { act: 2, gold: 8 }),
    enemy('anchor_hulk', 36, [move('wind', { type: 'charge' }, { type: 'lockDie', target: 'front' }), move('slam', atk(9, 'front'))], { act: 2, kind: 'elite' }),
    enemy('drowned_bell', 60, [move('toll', { type: 'lockDie', target: 'random' }, atk(3, 'all')), move('toll2', { type: 'lockDie', target: 'highestHp' }), move('crash', atk(9, 'all'))], {
      act: 2, kind: 'boss', passiveText: 'x',
      phases: [{ hpAtMostPct: 50, ai: { type: 'cycle', order: ['toll', 'toll2'] } }],
    }),
    enemy('ember_whelp', 14, [atk(2, 'all')], { act: 3 }),
    enemy('ash_cultist', 16, [move('chant', { type: 'status', status: 'strength', amount: 1, target: 'allAllies', side: 'enemy' }), move('burn', atk(4, 'random'))], { act: 3 }),
    enemy('slag_golem', 30, [atk(6)], { act: 3, startStatuses: { thorns: 2 } }),
    enemy('cinder_bat', 12, [move('nip', { type: 'stealReroll', amount: 1 }, atk(2, 'lowestHp', { hits: 2 }))], { act: 3 }),
    enemy('forge_smith', 22, [move('plate', { type: 'shield', amount: 5, target: 'allAllies' }), move('hammer', atk(5))], { act: 3 }),
    enemy('chain_warden', 20, [move('chain', { type: 'lockDie', target: 'all' }), move('lash', atk(4, 'all'))], { act: 3 }),
    enemy('soot_hexer', 15, [move('hex', { type: 'curseFace', target: 'front', face: 'showing' }, { type: 'status', status: 'mark', amount: 1, target: 'front', side: 'hero' }), move('bolt', atk(4, 'front')), move('wither', { type: 'curseFace', target: 'random', face: 'random' }, { type: 'status', status: 'weak', amount: 1, target: 'all', side: 'hero' })], { act: 3 }),
    enemy('obsidian_knight', 44, [move('wall', { type: 'shield', amount: 10, target: 'self' }, { type: 'status', status: 'regen', amount: 2, target: 'self', side: 'enemy' }), move('strike', atk(11, 'lowestHp'))], { act: 3, kind: 'elite' }),
    enemy('pip_eater', 80, [move('gnaw', { type: 'curseFace', target: 'random', face: 'highest' }, atk(4)), move('roar', atk(3, 'all'))], {
      act: 3, kind: 'boss', passiveText: 'x',
      passives: [
        { trigger: 'turnEnd', effects: [{ type: 'status', target: 'self', status: 'strength', amount: { scale: 'blanksShowing', factor: 1 } }] },
        { trigger: 'enemyDamaged', condition: { type: 'all', of: [{ type: 'ownerInvolved' }, { type: 'hpAtMostPct', pct: 30 }] }, limit: { per: 'fight', count: 1 }, effects: [{ type: 'curseFace', target: 'randomHero', face: 'random' }, { type: 'summon', enemy: 'ember_whelp', count: 1 }] },
      ],
    }),
  ];
  return content({
    heroes, items, enemies,
    rewardFaces: [
      rewardFace('r.heavy', 'damage', 5), rewardFace('r.wall', 'shield', 4), rewardFace('r.mend', 'heal', 4), rewardFace('r.jab', 'damage', 3, 'common', ['pierce']),
      rewardFace('r.venom', 'damage', 3, 'uncommon', ['venom']), rewardFace('r.twin', 'damage', 2, 'uncommon', ['twin']), rewardFace('r.grow', 'damage', 2, 'uncommon', ['growth']),
      rewardFace('r.rally', 'shield', 2, 'uncommon', ['rally']), rewardFace('r.echo', 'damage', 1, 'rare', ['echo']), rewardFace('r.ward', 'shield', 4, 'rare', ['ward']),
      rewardFace('r.reck', 'damage', 8, 'rare', ['reckless']), rewardFace('r.duel', 'damage', 4, 'common', ['poised'], ['duelist']),
    ],
    encounters: [
      { id: 'a1.rats', act: 1, kind: 'normal', slots: [1], enemies: ['gnaw_rat', 'gnaw_rat'] },
      { id: 'a1.mix', act: 1, kind: 'normal', slots: [1, 2], enemies: ['gnaw_rat', 'twig_archer'] },
      { id: 'a1.slime', act: 1, kind: 'normal', slots: [2, 3], enemies: ['mud_slime', 'bramble_imp'] },
      { id: 'a1.tricks', act: 1, kind: 'normal', slots: [2, 3], enemies: ['magpie_thief', 'web_spinner', 'mushroom_brute'] },
      { id: 'a1.elite', act: 1, kind: 'elite', enemies: ['hollow_stag', 'gnaw_rat'] },
      { id: 'a1.boss', act: 1, kind: 'boss', enemies: ['bramble_king'] },
      { id: 'a2.a', act: 2, kind: 'normal', slots: [1, 2], enemies: ['drowned_sailor', 'ink_squid'] },
      { id: 'a2.b', act: 2, kind: 'normal', slots: [1, 2, 3], enemies: ['crab_knight', 'eel_lancer'] },
      { id: 'a2.c', act: 2, kind: 'normal', slots: [2, 3], enemies: ['barnacle_golem', 'bell_diver', 'tide_witch'] },
      { id: 'a2.d', act: 2, kind: 'normal', slots: [3], enemies: ['coin_mimic', 'tide_witch', 'drowned_sailor'] },
      { id: 'a2.elite', act: 2, kind: 'elite', enemies: ['anchor_hulk', 'bell_diver'] },
      { id: 'a2.boss', act: 2, kind: 'boss', enemies: ['drowned_bell'] },
      { id: 'a3.a', act: 3, kind: 'normal', slots: [1, 2], enemies: ['ember_whelp', 'ash_cultist', 'cinder_bat'] },
      { id: 'a3.b', act: 3, kind: 'normal', slots: [1, 2, 3], enemies: ['slag_golem', 'forge_smith'] },
      { id: 'a3.c', act: 3, kind: 'normal', slots: [2, 3], enemies: ['chain_warden', 'soot_hexer', 'ember_whelp'] },
      { id: 'a3.elite', act: 3, kind: 'elite', enemies: ['obsidian_knight', 'ash_cultist'] },
      { id: 'a3.boss', act: 3, kind: 'boss', enemies: ['pip_eater'] },
    ],
    sets: SETS,
    events: [
      { id: 'ev.shrine', name: 'Shrine', text: '', acts: [1, 2, 3], choices: [
        { label: 'Pray', text: '', result: '', outcomes: [{ type: 'heal', target: 'all', amount: 3 }] },
        { label: 'Offer', text: '', result: '', costGold: 10, outcomes: [{ type: 'maxHp', target: 'all', amount: 1 }, { type: 'heal', target: 'lowest', amount: 2 }] },
        { label: 'Leave', text: '', result: '', outcomes: [{ type: 'nothing' }] },
      ] },
      { id: 'ev.gamble', name: 'Gamble', text: '', acts: [1, 2, 3], choices: [
        { label: 'Bleed', text: '', result: '', outcomes: [{ type: 'hurt', target: 'highest', amount: 4 }, { type: 'gold', amount: 20 }] },
        { label: 'Trade', text: '', result: '', outcomes: [{ type: 'blankFace', target: 'lowestValue' }, { type: 'item', rarity: 'uncommon' }] },
        { label: 'Train', text: '', result: '', outcomes: [{ type: 'upgradeFace', target: 'random', amount: 1 }, { type: 'hurt', target: 'random', amount: 2 }] },
      ] },
      { id: 'ev.forge', name: 'Forge', text: '', acts: [1, 2, 3], choices: [
        { label: 'Hone', text: '', result: '', outcomes: [{ type: 'upgradeFace', target: 'choose', amount: 2 }] },
        { label: 'Recast', text: '', result: '', outcomes: [{ type: 'rewardFace', rarity: 'rare' }, { type: 'item', item: 'iron_ration' }] },
        { label: 'Wreck', text: '', result: '', outcomes: [{ type: 'blankFace', target: 'random' }, { type: 'maxHp', target: 'random', amount: 3 }, { type: 'heal', target: 'random', amount: 2 }, { type: 'hurt', target: 'all', amount: 1 }] },
      ] },
      { id: 'ev.toll', name: 'Toll', text: '', acts: [2], choices: [
        { label: 'Pay', text: '', result: '', costGold: 9999, outcomes: [{ type: 'rewardFace' }] },
      ] },
    ],
    tiers: [
      { tier: 1, name: 'T1', text: '', modifiers: [{ type: 'enemyHpPct', amount: 10 }] },
      { tier: 2, name: 'T2', text: '', modifiers: [{ type: 'enemyAttack', amount: 1 }, { type: 'enemyStartShield', amount: 2 }] },
      { tier: 3, name: 'T3', text: '', modifiers: [{ type: 'rerolls', amount: -1, firstTurnOnly: true }, { type: 'enemyStartStatus', status: 'regen', amount: 1 }] },
      { tier: 4, name: 'T4', text: '', modifiers: [{ type: 'forceElite', slot: 3 }, { type: 'healingPct', amount: -25 }] },
      { tier: 5, name: 'T5', text: '', modifiers: [{ type: 'enemyPassive', kinds: ['elite', 'boss'], passive: { trigger: 'fightStart', effects: [{ type: 'status', target: 'self', status: 'strength', amount: 1 }] } }] },
    ],
    feats: [
      { id: 'ft.first', name: '', text: '', when: 'fightWon', tests: [{ stat: 'fightsWon', scope: 'run', op: '>=', value: 1 }], unlocks: { heroes: ['gambler'], items: ['void_pip'] } },
      { id: 'ft.boss', name: '', text: '', when: 'bossWon', tests: [{ stat: 'rerollsSpent', scope: 'fight', op: '==', value: 0 }], unlocks: { heroes: ['redhand'] } },
      { id: 'ft.big', name: '', text: '', when: 'turnEnd', tests: [{ stat: 'damageDealt', scope: 'turn', op: '>=', value: 8 }], unlocks: { heroes: ['automaton'], items: ['echo_bell'] } },
      { id: 'ft.kills', name: '', text: '', when: 'runEnded', tests: [{ stat: 'enemiesKilled', scope: 'lifetime', op: '>=', value: 10 }], unlocks: { heroes: ['grower', 'hexer'] } },
      { id: 'ft.win', name: '', text: '', when: 'runWon', tests: [{ stat: 'livingHeroes', scope: 'run', op: '>=', value: 1 }], unlocks: { items: ['phoenix_feather', 'kings_die'] } },
    ],
  });
}
