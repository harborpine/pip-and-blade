import type { Amount, Condition, ContentDB, Effect, FaceDef, GameState, ItemDef, Selector, Trigger, TriggeredEffect } from '@shared';
import { describe, expect, it } from 'vitest';
import { content, enemy, face, hero, item, move, SETS } from './testing/fixtures';
import { ally, END, fight, foe, play, toNextFight, use } from './testing/harness';

const party = (a: FaceDef, b: FaceDef = a, c: FaceDef = a) => [hero('bulwark', a), hero('duelist', b), hero('herbalist', c)];
const values = (engine: ReturnType<typeof fight>['engine'], g: GameState): number[] => engine.dice(g).map((d) => d.value);
const F = (g: GameState) => g.run!.fight!;
const GOLD: Effect[] = [{ type: 'gold', amount: 1 }];
/** An item with a single trigger (by default it pays 1 gold, which makes firing easy to count). */
const probe = (trigger: Trigger, condition?: Condition, effects: Effect[] = GOLD, limit?: TriggeredEffect['limit']): ItemDef =>
  item('whetstone', { triggers: [{ trigger, condition, effects, limit }] });
const attacker = (amount = 3) => enemy('gnaw_rat', 30, [{ type: 'attack', amount, target: 'front' }]);

describe('modifiers', () => {
  it('maxHp raises (or lowers) the holder\'s maximum and current HP, and is undone when the item is replaced', () => {
    const c = content({ items: [item('iron_ration', { modifiers: [{ type: 'maxHp', amount: 4 }] }), item('gamblers_ante', { modifiers: [{ type: 'maxHp', amount: -3 }] }), item('whetstone'), item('lucky_coin')] });
    const { game } = fight({ content: c, items: [['iron_ration'], ['gamblers_ante']] });
    expect(game.run!.heroes.map((h) => [h.hp, h.maxHp])).toEqual([[24, 24], [17, 17], [20, 20]]);
    // replacing through a treasure-style reward: build a reward state by hand
    const { engine, game: g2 } = fight({ content: c, items: [['iron_ration', 'whetstone']] });
    g2.run!.fight = null;
    g2.run!.phase = 'reward';
    g2.run!.reward = { options: [{ type: 'item', item: 'lucky_coin', rarity: 'common' }], picksLeft: 0, source: 'treasure' };
    expect(engine.canApply(g2, { type: 'pickReward', option: 0, hero: 0 })).toBe(false);
    const g3 = play(engine, g2, { type: 'pickReward', option: 0, hero: 0, replaceItem: 0 });
    expect(g3.run!.heroes[0]).toMatchObject({ hp: 20, maxHp: 20, items: ['lucky_coin', 'whetstone'] });
  });

  it('rerolls adds rerolls every turn, or only on turn 1 with firstTurnOnly', () => {
    const c = content({ items: [item('gamblers_ante', { modifiers: [{ type: 'rerolls', amount: 1 }] }), item('lucky_coin', { modifiers: [{ type: 'rerolls', amount: 2, firstTurnOnly: true }] })] });
    const { engine, game } = fight({ content: c, items: [['gamblers_ante', 'lucky_coin']] });
    expect(F(game).rerollsLeft).toBe(5);
    expect(F(play(engine, game, END)).rerollsLeft).toBe(3);
  });

  it('faceValue respects filter and scope', () => {
    const c = content({ items: [
      item('whetstone', { modifiers: [{ type: 'faceValue', amount: 1, filter: { effect: ['damage', 'shield'] }, scope: 'owner' }] }),
      item('healers_satchel', { modifiers: [{ type: 'faceValue', amount: 2, filter: { symbol: ['heart', 'guard'] }, scope: 'party' }] }),
      item('reckless_idol', { modifiers: [{ type: 'faceValue', amount: 5, filter: { keyword: ['pierce'] }, scope: 'party' }] }),
    ] });
    expect(values(...Object.values(fight({ content: c, items: [[], ['whetstone']] })) as [never, never])).toEqual([2, 4, 2]);
    expect(values(...Object.values(fight({ content: c, items: [[], ['healers_satchel']] })) as [never, never])).toEqual([4, 3, 4]);
    expect(values(...Object.values(fight({ content: c, items: [[], ['reckless_idol']] })) as [never, never])).toEqual([2, 3, 2]);
    const p = fight({ content: content({ items: c.items, heroes: party(face('damage', 1, ['pierce']), face('damage', 1)) }), items: [[], ['reckless_idol']] });
    expect(values(p.engine, p.game)).toEqual([6, 1, 6]);
  });

  it('faceValue hpAtMostPct and noRerollsSpent are live conditions', () => {
    const c = content({ items: [
      item('red_bandana', { modifiers: [{ type: 'faceValue', amount: 2, scope: 'owner', hpAtMostPct: 50 }] }),
      item('kings_die', { modifiers: [{ type: 'faceValue', amount: 1, scope: 'party', noRerollsSpent: true }] }),
    ] });
    const a = fight({ content: c, items: [['red_bandana'], ['red_bandana']], hp: [10, 11, 20] });
    expect(values(a.engine, a.game)).toEqual([4, 3, 2]);
    const b = fight({ content: c, items: [['kings_die']] });
    expect(values(b.engine, b.game)).toEqual([3, 4, 3]);
    expect(values(b.engine, play(b.engine, b.game, { type: 'reroll' }))).toEqual([2, 3, 2]);
  });

  it('blankAs makes blank faces act as an effect (still without a symbol) and counts blank damage', () => {
    const c = content({ heroes: party(face('blank')), items: [item('hollow_die', { modifiers: [{ type: 'blankAs', effect: 'damage', value: 2 }] })] });
    const { engine, game } = fight({ content: c, items: [['hollow_die']] });
    expect(engine.dice(game)[1]).toMatchObject({ effect: 'damage', value: 2, symbol: null, needsTarget: true });
    const g = play(engine, game, use(1, foe(game)));
    expect(F(g).enemies[0]!.hp).toBe(28);
    expect(g.run!.stats.run.blankDamage).toBe(2);
  });

  it('several blankAs items all apply to one blank, cursed faces included', () => {
    const c = content({
      heroes: party(face('damage', 9)),
      items: [
        item('void_pip', { modifiers: [{ type: 'blankAs', effect: 'shield', value: 2, cleave: true }] }),
        item('hollow_die', { modifiers: [{ type: 'blankAs', effect: 'damage', value: 2 }] }),
        item('whetstone', { modifiers: [{ type: 'faceValue', amount: 1, filter: { effect: ['blank'] }, scope: 'party' }] }),
      ],
    });
    const { engine, game } = fight({ content: c, items: [['void_pip', 'hollow_die'], ['whetstone']] });
    F(game).heroes[2]!.cursed = [0, 1, 2, 3, 4, 5];
    expect(engine.dice(game)[2]).toMatchObject({ effect: 'damage', value: 3, cursed: true, needsTarget: true });
    const pv = engine.previewDie(game, 2, foe(game));
    expect(pv.hits.find((h) => h.target.side === 'enemy')).toMatchObject({ hpLoss: 3 });
    expect(pv.hits.filter((h) => h.target.side === 'hero').map((h) => h.shieldGain)).toEqual([3, 3, 3]);
    const g = play(engine, game, use(2, foe(game)));
    expect(F(g).enemies[0]!.hp).toBe(27);
    expect(F(g).heroes.map((h) => h.shield)).toEqual([3, 3, 3]);
  });

  it('rerolledBonus applies to dice that were rerolled this turn', () => {
    const c = content({ items: [item('loaded_pip', { modifiers: [{ type: 'rerolledBonus', amount: 1, scope: 'party' }] }), item('whetstone', { modifiers: [{ type: 'rerolledBonus', amount: 3, scope: 'owner' }] })] });
    const { engine, game } = fight({ content: c, items: [['loaded_pip'], ['whetstone']] });
    const g = play(engine, game, { type: 'toggleLock', die: 2 }, { type: 'reroll' });
    expect(values(engine, g)).toEqual([3, 7, 2]);
    expect(values(engine, play(engine, g, END))).toEqual([2, 3, 2]);
  });

  it('firstLockMultiplier multiplies the first die locked each turn', () => {
    const c = content({ items: [item('first_pick_glove', { modifiers: [{ type: 'firstLockMultiplier', factor: 2 }] })] });
    const { engine, game } = fight({ content: c, items: [['first_pick_glove']] });
    const g = play(engine, game, { type: 'toggleLock', die: 1 }, { type: 'toggleLock', die: 2 }, { type: 'toggleLock', die: 1 });
    expect(values(engine, g)).toEqual([2, 6, 2]);
    expect(F(play(engine, g, use(1, foe(g)))).enemies[0]!.hp).toBe(24);
  });

  it('grantKeyword gives matching faces a keyword', () => {
    const c = content({ items: [item('cleaver_hook', { modifiers: [{ type: 'grantKeyword', keyword: 'cleave', filter: { effect: ['damage'] }, scope: 'owner' }, { type: 'faceValue', amount: -1, filter: { effect: ['damage'] }, scope: 'owner' }] })] });
    const { engine, game } = fight({ content: c, items: [[], ['cleaver_hook']], enemies: ['gnaw_rat', 'gnaw_rat'] });
    expect(engine.dice(game)[1]).toMatchObject({ value: 2, needsTarget: false, keywords: ['cleave'] });
    expect(engine.dice(game)[0]!.keywords).toEqual([]);
    expect(F(play(engine, game, use(1))).enemies.map((e) => e.hp)).toEqual([28, 28]);
  });

  it('shieldPersists keeps normal shield across turns for those in scope', () => {
    const c = content({ heroes: party(face('shield', 2, ['cleave'])), items: [item('ward_stone', { modifiers: [{ type: 'shieldPersists', scope: 'owner' }] })] });
    const { engine, game } = fight({ content: c, items: [[], ['ward_stone']] });
    const g = play(engine, game, use(0), END);
    expect(F(g).heroes.map((h) => h.shield)).toEqual([0, 2, 0]);
  });

  it('shieldGain adds to all shield gained by heroes in scope', () => {
    const c = content({ heroes: party(face('shield', 2, ['cleave'])), items: [item('tortoise_shell', { modifiers: [{ type: 'shieldGain', amount: 1, scope: 'owner' }] })] });
    const { engine, game } = fight({ content: c, items: [['tortoise_shell']] });
    const g = play(engine, game, use(0));
    expect(F(g).heroes.map((h) => h.shield)).toEqual([3, 2, 2]);
    expect(g.run!.stats.turn.shieldGained).toBe(7);
  });

  it('statusPotency adds stacks to statuses the party applies', () => {
    const c = content({ heroes: party(face('damage', 3, ['venom'])), items: [item('venom_vial', { modifiers: [{ type: 'statusPotency', status: 'poison', amount: 1 }] })] });
    const { engine, game } = fight({ content: c, items: [['venom_vial']] });
    const g = play(engine, game, use(0, foe(game)));
    expect(F(g).enemies[0]!.statuses.poison).toBe(4);
    expect(g.run!.stats.run.poisonApplied).toBe(4);
  });

  it('growthStep makes Growth faces grow faster', () => {
    const c = content({ heroes: party(face('damage', 2, ['growth'])), items: [item('seedling_pot', { modifiers: [{ type: 'growthStep', amount: 2 }] })] });
    const { engine, game } = fight({ content: c, items: [['seedling_pot']] });
    const g = play(engine, game, use(0, foe(game)));
    expect(F(g).heroes[0]!.growth[F(g).dice[0]!.face]).toBe(3);
    expect(g.run!.stats.run.growthGained).toBe(3);
  });

  it('startStatus puts a status on the holder at fight start (thorns hurt attackers per hit)', () => {
    const c = content({ enemies: [enemy('gnaw_rat', 30, [{ type: 'attack', amount: 1, target: 'front', hits: 3 }])], items: [item('thorn_mail', { modifiers: [{ type: 'startStatus', status: 'thorns', amount: 2 }] })] });
    const { engine, game } = fight({ content: c, items: [['thorn_mail']] });
    expect(F(game).heroes[0]!.statuses.thorns).toBe(2);
    const g = play(engine, game, END);
    expect(F(g).enemies[0]!.hp).toBe(24);
    expect(g.run!.heroes[0]!.hp).toBe(17);
  });

  it('healAfterFight heals every living hero after a win, and goldGainPct raises gold gained', () => {
    const c = content({
      enemies: [enemy('gnaw_rat', 3, undefined, { gold: 4 })],
      items: [item('field_medic_kit', { modifiers: [{ type: 'healAfterFight', amount: 2 }] }), item('purse_string', { modifiers: [{ type: 'goldGainPct', amount: 25 }] })],
    });
    const { engine, game } = fight({ content: c, items: [['field_medic_kit', 'purse_string']], hp: [10, 19, 20] });
    const res = engine.apply(game, use(1, foe(game)));
    expect(res.game.run!.heroes.map((h) => h.hp)).toEqual([12, 20, 20]);
    expect(res.game.run!.gold).toBe(5 + 12);
    expect(res.events).toContainEqual({ type: 'fightWon', gold: 12 });
  });

  it('freeSingleReroll makes rerolling exactly one die free, a limited number of times per turn', () => {
    const c = content({ items: [item('pip_magnet', { modifiers: [{ type: 'freeSingleReroll', count: 1 }] })] });
    const { engine, game } = fight({ content: c, items: [['pip_magnet']] });
    let g = play(engine, game, { type: 'toggleLock', die: 0 }, { type: 'toggleLock', die: 1 }, { type: 'reroll' });
    expect(F(g)).toMatchObject({ rerollsLeft: 2, rerollsSpent: 0 });
    expect(F(g).dice[2]!.rerolled).toBe(true);
    g = play(engine, g, { type: 'reroll' });
    expect(F(g)).toMatchObject({ rerollsLeft: 1, rerollsSpent: 1 });
    g = play(engine, g, { type: 'reroll' });
    expect(engine.canApply(g, { type: 'reroll' })).toBe(false);
    g = play(engine, g, END, { type: 'toggleLock', die: 0 }, { type: 'toggleLock', die: 1 }, { type: 'reroll' }, { type: 'reroll' }, { type: 'reroll' });
    expect(F(g).rerollsLeft).toBe(0);
  });

  it('items on a downed hero are inactive', () => {
    const c = content({ items: [item('whetstone', { modifiers: [{ type: 'faceValue', amount: 5, scope: 'party' }] })] });
    const { engine, game } = fight({ content: c, items: [['whetstone']], enemies: undefined });
    expect(values(engine, game)).toEqual([7, 8, 7]);
    game.run!.heroes[0]!.downed = true;
    game.run!.heroes[0]!.hp = 0;
    expect(values(engine, game).slice(1)).toEqual([3, 2]);
  });
});

describe('triggers', () => {
  const goldAfter = (it: ItemDef, script: (engine: ReturnType<typeof fight>['engine'], g: GameState) => GameState, over: Partial<ContentDB> = {}, holder = 1, hp?: number[]): number => {
    const { engine, game } = fight({ content: content({ items: [it], ...over }), items: holder === 0 ? [[it.id]] : [[], [it.id]], hp });
    return script(engine, game).run!.gold;
  };
  const turn = (engine: ReturnType<typeof fight>['engine'], g: GameState): GameState => play(engine, g, use(0, ally(0)), use(1, foe(g)), use(2, ally(0)));

  it('fightStart, turnStart, rollEnd, turnEnd and enemyPhaseEnd fire once at their moment', () => {
    expect(goldAfter(probe('fightStart'), (_, g) => g)).toBe(1);
    expect(goldAfter(probe('turnStart'), (e, g) => play(e, g, END))).toBe(2);
    expect(goldAfter(probe('rollEnd'), (_, g) => g)).toBe(0);
    expect(goldAfter(probe('rollEnd'), turn)).toBe(1);
    expect(goldAfter(probe('rollEnd'), (e, g) => play(e, g, END))).toBe(1);
    expect(goldAfter(probe('turnEnd'), (e, g) => play(e, g, END, END))).toBe(2);
    expect(goldAfter(probe('enemyPhaseEnd'), (e, g) => play(e, g, END))).toBe(1);
  });

  it('dieLocked fires the first time each die is locked in a turn; dieRerolled once per die rerolled', () => {
    const locks = (e: ReturnType<typeof fight>['engine'], g: GameState): GameState =>
      play(e, g, { type: 'toggleLock', die: 0 }, { type: 'toggleLock', die: 0 }, { type: 'toggleLock', die: 0 }, { type: 'toggleLock', die: 2 });
    expect(goldAfter(probe('dieLocked'), locks)).toBe(2);
    expect(goldAfter(probe('dieLocked', { type: 'ownerDie' }), locks)).toBe(0);
    expect(goldAfter(probe('dieRerolled'), (e, g) => play(e, g, { type: 'toggleLock', die: 0 }, { type: 'reroll' }, { type: 'reroll' }))).toBe(4);
    expect(goldAfter(probe('dieRerolled', { type: 'ownerDie' }), (e, g) => play(e, g, { type: 'reroll' }))).toBe(1);
  });

  it('dieUsed fires after each die; heroDamaged, enemyDamaged and enemyKilled on HP loss and deaths', () => {
    expect(goldAfter(probe('dieUsed'), turn)).toBe(3);
    const over = { enemies: [attacker(3), enemy('mud_slime', 3)], encounters: [{ id: 'e', act: 1 as const, kind: 'normal' as const, enemies: ['gnaw_rat' as const, 'mud_slime' as const] }] };
    expect(goldAfter(probe('heroDamaged'), (e, g) => play(e, g, END), over)).toBe(1);
    expect(goldAfter(probe('heroDamaged'), (e, g) => play(e, g, use(0, ally(0)), END), over)).toBe(1);
    expect(goldAfter(probe('heroDamaged'), (e, g) => play(e, g, use(0, ally(0)), use(2, ally(0)), END), { ...over, heroes: party(face('shield', 2)) })).toBe(0);
    expect(goldAfter(probe('enemyDamaged'), (e, g) => play(e, g, use(1, foe(g))), over)).toBe(1);
    expect(goldAfter(probe('enemyKilled'), (e, g) => play(e, g, use(1, foe(g, 1))), over)).toBe(1);
    expect(goldAfter(probe('enemyKilled'), (e, g) => play(e, g, use(1, foe(g, 0))), over)).toBe(0);
  });

  it('setFormed fires once per set formed', () => {
    const over = { sets: SETS, heroes: party(face('damage', 2)) };
    expect(goldAfter(probe('setFormed'), (e, g) => play(e, g, END, END), over)).toBe(2);
    expect(goldAfter(probe('setFormed', { type: 'set', kind: 'pair' }), (e, g) => play(e, g, END), over)).toBe(0);
    expect(goldAfter(probe('setFormed', { type: 'set', kind: 'triple', symbol: 'blade' }), (e, g) => play(e, g, END), over)).toBe(1);
  });

  it('fightEnd fires when the fight is won', () => {
    expect(goldAfter(probe('fightEnd', undefined, [{ type: 'gold', amount: 7 }]), (e, g) => play(e, g, use(1, foe(g))), { enemies: [enemy('gnaw_rat', 3)] })).toBe(17);
  });

  it('heroDowned triggers still work from the downed hero\'s own items; revive brings the owner back once per run', () => {
    const feather = item('phoenix_feather', { triggers: [{ trigger: 'heroDowned', condition: { type: 'ownerInvolved' }, limit: { per: 'run', count: 1 }, effects: [{ type: 'revive', pct: 50 }] }] });
    const c = content({ items: [feather], enemies: [enemy('gnaw_rat', 30, [{ type: 'attack', amount: 25, target: 'front' }])] });
    const { engine, game } = fight({ content: c, items: [['phoenix_feather']] });
    const fc = engine.forecast(game);
    expect(fc.heroes[0]).toMatchObject({ hpLoss: 10, downed: false });
    const res = engine.apply(game, END);
    expect(res.events).toContainEqual({ type: 'heroRevived', hero: 0 });
    expect(res.game.run!.heroes[0]).toMatchObject({ hp: 10, downed: false });
    expect(F(res.game).dice.map((d) => d.hero)).toEqual([0, 1, 2]);
    const again = play(engine, res.game, END);
    expect(again.run!.heroes[0]).toMatchObject({ hp: 0, downed: true });
    expect(again.run!.limits['phoenix_feather#0@0']).toBe(1);
  });

  it('conditions', () => {
    const cases: [Condition, number][] = [
      [{ type: 'ownerDie' }, 1],
      [{ type: 'face', filter: { effect: ['damage'] } }, 1],
      [{ type: 'diceUsed', op: '==', value: 2 }, 1],
      [{ type: 'diceUsed', op: '>=', value: 2 }, 2],
      [{ type: 'unusedDice', op: '==', value: 1 }, 1],
      [{ type: 'unusedDice', op: '<=', value: 1 }, 2],
      [{ type: 'allDiceUsed' }, 1],
      [{ type: 'rerollsSpent', op: '==', value: 0 }, 3],
      [{ type: 'turn', op: '>=', value: 2 }, 0],
      [{ type: 'turn', op: '<=', value: 1 }, 3],
      [{ type: 'hpAtMostPct', pct: 50 }, 0],
      [{ type: 'set' }, 0],
      [{ type: 'all', of: [{ type: 'ownerDie' }, { type: 'face', filter: { effect: ['damage'] } }] }, 1],
      [{ type: 'all', of: [{ type: 'ownerDie' }, { type: 'face', filter: { effect: ['heal'] } }] }, 0],
      [{ type: 'any', of: [{ type: 'ownerDie' }, { type: 'allDiceUsed' }] }, 2],
      [{ type: 'not', of: { type: 'ownerDie' } }, 2],
    ];
    for (const [cond, expected] of cases) expect([cond, goldAfter(probe('dieUsed', cond), turn)]).toEqual([cond, expected]);
    expect(goldAfter(probe('dieUsed', { type: 'hpAtMostPct', pct: 50 }), turn, {}, 1, [20, 10, 20])).toBe(3);
    expect(goldAfter(probe('dieUsed', { type: 'rerollsSpent', op: '>=', value: 1 }), (e, g) => turn(e, play(e, g, { type: 'reroll' })))).toBe(3);
    expect(goldAfter(probe('dieUsed', { type: 'set', kind: 'pair' }), turn, { sets: SETS, heroes: party(face('shield', 2), face('damage', 2), face('heal', 2, [], 'blade')) })).toBe(3);
    // ownerInvolved: only when the holder is the hero hit
    const over = { enemies: [attacker(3)] };
    expect(goldAfter(probe('heroDamaged', { type: 'ownerInvolved' }), (e, g) => play(e, g, END), over, 0)).toBe(1);
    expect(goldAfter(probe('heroDamaged', { type: 'ownerInvolved' }), (e, g) => play(e, g, END), over, 1)).toBe(0);
    // targetHasStatus looks at the damaged / killed unit
    const poisoned = { enemies: [enemy('gnaw_rat', 30, undefined, { startStatuses: { poison: 2 } })] };
    expect(goldAfter(probe('enemyDamaged', { type: 'targetHasStatus', status: 'poison' }), (e, g) => play(e, g, use(1, foe(g))), poisoned)).toBe(1);
    expect(goldAfter(probe('enemyDamaged', { type: 'targetHasStatus', status: 'poison' }), (e, g) => play(e, g, use(1, foe(g))))).toBe(0);
  });

  it('limits cap how often a trigger fires per turn, per fight and per run', () => {
    const twoTurns = (e: ReturnType<typeof fight>['engine'], g: GameState): GameState => turn(e, play(e, turn(e, g), END));
    expect(goldAfter(probe('dieUsed', undefined, GOLD, { per: 'turn', count: 2 }), twoTurns)).toBe(4);
    expect(goldAfter(probe('dieUsed', undefined, GOLD, { per: 'fight', count: 2 }), twoTurns)).toBe(2);
    const nextFight = (e: ReturnType<typeof fight>['engine'], g: GameState): GameState => {
      let x = turn(e, g);
      F(x).enemies[0]!.hp = 1;
      x = play(e, x, END, use(1, foe(x)));
      const goldBefore = x.run!.gold;
      x = turn(e, toNextFight(e, x));
      x.run!.gold -= goldBefore - 2;
      return x;
    };
    const onward = { doors: [{ kind: 'onward' as const, name: '', text: '', weight: [1, 1, 1] as [number, number, number] }] };
    expect(goldAfter(probe('dieUsed', undefined, GOLD, { per: 'fight', count: 2 }), nextFight, onward)).toBe(4);
    expect(goldAfter(probe('dieUsed', undefined, GOLD, { per: 'run', count: 2 }), nextFight, onward)).toBe(2);
  });
});

describe('effects', () => {
  const withItem = (effects: Effect[], trigger: Trigger = 'dieUsed', condition: Condition | null = { type: 'ownerDie' }, over: Partial<ContentDB> = {}, hp?: number[]) =>
    fight({ content: content({ items: [probe(trigger, condition ?? undefined, effects)], ...over }), items: [[], ['whetstone']], hp });

  it('damage (with and without pierce) from an item', () => {
    const shielded = { enemies: [enemy('gnaw_rat', 30, undefined, { startShield: 2 })], heroes: party(face('shield', 1)) };
    const a = withItem([{ type: 'damage', target: 'frontEnemy', amount: 3 }], 'dieUsed', { type: 'ownerDie' }, shielded);
    const res = a.engine.apply(a.game, use(1, ally(1)));
    expect(F(res.game).enemies[0]).toMatchObject({ hp: 29, shield: 0 });
    expect(res.events).toContainEqual({ type: 'itemTriggered', item: 'whetstone', hero: 1 });
    expect(res.events.find((e) => e.type === 'damage')).toMatchObject({ amount: 1, blocked: 2, cause: 'item' });
    const b = withItem([{ type: 'damage', target: 'frontEnemy', amount: 3, pierce: true }], 'dieUsed', { type: 'ownerDie' }, shielded);
    expect(F(play(b.engine, b.game, use(1, ally(1)))).enemies[0]).toMatchObject({ hp: 27, shield: 2 });
  });

  it('shield (normal and ward), heal and status', () => {
    const a = withItem([{ type: 'shield', target: 'owner', amount: 3 }, { type: 'shield', target: 'owner', amount: 2, ward: true }], 'fightStart', null);
    expect(F(a.game).heroes[1]).toMatchObject({ shield: 3, ward: 2 });
    expect(F(play(a.engine, a.game, END)).heroes[1]).toMatchObject({ shield: 0, ward: 2 });
    const b = withItem([{ type: 'heal', target: 'lowestHpHero', amount: 4 }], 'dieUsed', { type: 'ownerDie' }, {}, [20, 20, 5]);
    expect(play(b.engine, b.game, use(1, foe(b.game))).run!.heroes[2]!.hp).toBe(9);
    const c = withItem([{ type: 'status', target: 'allEnemies', status: 'mark', amount: 2 }], 'turnStart', null);
    expect(F(c.game).enemies[0]!.statuses.mark).toBe(2);
    expect(F(play(c.engine, c.game, use(1, foe(c.game)))).enemies[0]!.hp).toBe(25);
  });

  it('rerolls now and next turn; gold', () => {
    const a = withItem([{ type: 'rerolls', amount: 1, when: 'now' }], 'dieLocked', null);
    expect(F(play(a.engine, a.game, { type: 'toggleLock', die: 0 })).rerollsLeft).toBe(3);
    const b = withItem([{ type: 'rerolls', amount: 2, when: 'nextTurn' }], 'turnEnd', null);
    expect(F(play(b.engine, b.game, END)).rerollsLeft).toBe(4);
    const c = withItem([{ type: 'gold', amount: 5 }], 'enemyKilled', null, { enemies: [enemy('gnaw_rat', 3), enemy('mud_slime', 30)], encounters: [{ id: 'e', act: 1, kind: 'normal', enemies: ['gnaw_rat', 'mud_slime'] }] });
    expect(play(c.engine, c.game, use(1, foe(c.game))).run!.gold).toBe(5);
  });

  it('dieBonus with every die selector', () => {
    const v = (dice: Extract<Effect, { type: 'dieBonus' }>['dice'], trigger: Trigger, over: Partial<ContentDB> = {}): number[] => {
      const x = withItem([{ type: 'dieBonus', dice, amount: 2 }], trigger, null, over);
      const g = trigger === 'dieLocked' ? play(x.engine, x.game, { type: 'toggleLock', die: 2 }) : x.game;
      return values(x.engine, g);
    };
    expect(v('allDice', 'turnStart')).toEqual([4, 5, 4]);
    expect(v('ownerDie', 'turnStart')).toEqual([2, 5, 2]);
    expect(v('triggerDie', 'dieLocked')).toEqual([2, 3, 4]);
    expect(v('otherDice', 'dieLocked')).toEqual([4, 5, 2]);
    expect(v('setDice', 'setFormed', { sets: SETS, heroes: party(face('damage', 1), face('damage', 1), face('heal', 1)) })).toEqual([4, 4, 1]);
  });

  it('the "first die used" pattern: bonus on all dice at turn start, removed from the others after the first use', () => {
    const drum = item('battle_drum', { triggers: [
      { trigger: 'turnStart', effects: [{ type: 'dieBonus', dice: 'allDice', amount: 2 }] },
      { trigger: 'dieUsed', condition: { type: 'diceUsed', op: '==', value: 1 }, effects: [{ type: 'dieBonus', dice: 'otherDice', amount: -2 }] },
    ] });
    const { engine, game } = fight({ content: content({ items: [drum], heroes: party(face('damage', 3)) }), items: [['battle_drum']] });
    const g = play(engine, game, use(2, foe(game)));
    expect(F(g).enemies[0]!.hp).toBe(25);
    expect(values(engine, g).slice(0, 2)).toEqual([3, 3]);
  });

  it('dieMultiply and dieRepeat', () => {
    const a = withItem([{ type: 'dieMultiply', dice: 'ownerDie', factor: 2 }], 'turnStart', null);
    expect(values(a.engine, a.game)).toEqual([2, 6, 2]);
    const b = withItem([{ type: 'dieRepeat', dice: 'setDice', times: 1 }], 'setFormed', { type: 'set', kind: 'triple' }, { sets: SETS, heroes: party(face('heal', 1), face('heal', 1), face('heal', 1)) }, [1, 20, 20]);
    expect(b.engine.previewDie(b.game, 1, ally(0)).hits[0]).toMatchObject({ heal: 6 });
    expect(play(b.engine, b.game, use(1, ally(0))).run!.heroes[0]!.hp).toBe(7);
  });

  it('selectors', () => {
    const trio = { enemies: [enemy('gnaw_rat', 30), enemy('mud_slime', 10), enemy('twig_archer', 20)], encounters: [{ id: 'e', act: 1 as const, kind: 'normal' as const, enemies: ['gnaw_rat' as const, 'mud_slime' as const, 'twig_archer' as const] }] };
    const marks = (target: Selector): number[] => {
      const x = withItem([{ type: 'status', target, status: 'mark', amount: 1 }], 'dieUsed', { type: 'ownerDie' }, trio);
      return F(play(x.engine, x.game, use(1, foe(x.game, 1)))).enemies.map((e) => e.statuses.mark ?? 0);
    };
    expect(marks('allEnemies')).toEqual([1, 1, 1]);
    expect(marks('frontEnemy')).toEqual([1, 0, 0]);
    expect(marks('lowestHpEnemy')).toEqual([0, 1, 0]);
    expect(marks('otherEnemies')).toEqual([1, 0, 1]);
    expect(marks('triggerTarget')).toEqual([0, 1, 0]);
    expect(marks('randomEnemy').reduce((a, b) => a + b, 0)).toBe(1);
    const shields = (target: Selector): number[] => {
      const x = withItem([{ type: 'shield', target, amount: 1 }], 'dieUsed', { type: 'ownerDie' }, trio, [20, 20, 5]);
      return F(play(x.engine, x.game, use(1, foe(x.game, 1)))).heroes.map((h) => h.shield);
    };
    expect(shields('owner')).toEqual([0, 1, 0]);
    expect(shields('self')).toEqual([0, 1, 0]);
    expect(shields('allHeroes')).toEqual([1, 1, 1]);
    expect(shields('frontHero')).toEqual([1, 0, 0]);
    expect(shields('lowestHpHero')).toEqual([0, 0, 1]);
    expect(shields('triggerSource')).toEqual([0, 1, 0]);
    expect(shields('randomHero').reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('amounts scale from the situation', () => {
    const gold = (amount: Amount, trigger: Trigger = 'dieUsed', over: Partial<ContentDB> = {}, pre: ('reroll')[] = []): number => {
      const x = withItem([{ type: 'gold', amount }], trigger, trigger === 'dieUsed' ? { type: 'ownerDie' } : null, over);
      let g = x.game;
      for (const p of pre) g = play(x.engine, g, { type: p });
      return play(x.engine, g, use(1, foe(g))).run!.gold;
    };
    expect(gold({ scale: 'triggerValue', factor: 2, plus: 1 })).toBe(7);
    expect(gold({ scale: 'triggerValue', factor: 0.5 })).toBe(1);
    expect(gold({ scale: 'rerollsLeft', factor: 1 }, 'dieUsed', {}, ['reroll'])).toBe(1);
    expect(gold({ scale: 'rerollsSpent', factor: 3 }, 'dieUsed', {}, ['reroll'])).toBe(3);
    expect(gold({ scale: 'unusedDice', factor: 1 })).toBe(2);
    expect(gold({ scale: 'setSize', factor: 1 }, 'setFormed', { sets: SETS, heroes: party(face('damage', 1)) })).toBe(3);
    expect(gold({ scale: 'targetStatus', status: 'poison', factor: 1 }, 'dieUsed', { enemies: [enemy('gnaw_rat', 30, undefined, { startStatuses: { poison: 4 } })] })).toBe(4);
    expect(gold({ scale: 'blanksShowing', factor: 1 }, 'dieUsed', { heroes: party(face('blank'), face('damage', 1), face('blank')) })).toBe(2);
  });

  it('poison can spread from a dying enemy (enemyKilled + targetHasStatus + targetStatus + otherEnemies)', () => {
    const censer = item('plague_censer', { triggers: [{ trigger: 'enemyKilled', condition: { type: 'targetHasStatus', status: 'poison' }, effects: [{ type: 'status', target: 'otherEnemies', status: 'poison', amount: { scale: 'targetStatus', status: 'poison', factor: 1 } }] }] });
    const c = content({ items: [censer], enemies: [enemy('gnaw_rat', 3, undefined, { startStatuses: { poison: 5 } }), enemy('mud_slime', 30)] });
    const { engine, game } = fight({ content: c, items: [['plague_censer']], enemies: ['gnaw_rat', 'mud_slime'] });
    const g = play(engine, game, END);
    expect(F(g).enemies.map((e) => [e.enemyId, e.hp, e.statuses.poison])).toEqual([['mud_slime', 25, 4]]); // spread lands before the slime's own tick
  });

  it('a chain of triggers cannot loop forever', () => {
    const loop = item('whetstone', { triggers: [{ trigger: 'enemyDamaged', effects: [{ type: 'damage', target: 'triggerTarget', amount: 1 }] }] });
    const { engine, game } = fight({ content: content({ items: [loop], enemies: [enemy('gnaw_rat', 1000), move('x', { type: 'charge' })].slice(0, 1) as never }), items: [['whetstone']] });
    const g = play(engine, game, use(1, foe(game)));
    expect(F(g).enemies[0]!.hp).toBe(1000 - 3 - 6);
  });

  it('an enemy passive can use the same effects with self / ownerInvolved', () => {
    const spiky = enemy('gnaw_rat', 30, undefined, { passives: [
      { trigger: 'enemyDamaged', condition: { type: 'ownerInvolved' }, effects: [{ type: 'damage', target: 'triggerSource', amount: 1 }, { type: 'shield', target: 'self', amount: 1 }] },
    ] });
    const c = content({ enemies: [spiky, enemy('mud_slime', 30)] });
    const { engine, game } = fight({ content: c, enemies: ['gnaw_rat', 'mud_slime'] });
    const res = engine.apply(game, use(1, foe(game, 1)));
    expect(res.game.run!.heroes[1]!.hp).toBe(20);
    const hit = engine.apply(game, use(1, foe(game, 0)));
    expect(hit.game.run!.heroes[1]!.hp).toBe(19);
    expect(F(hit.game).enemies[0]!.shield).toBe(1);
    expect(hit.events).toContainEqual({ type: 'passiveTriggered', uid: 1 });
    expect(engine.previewDie(game, 1, foe(game, 0))).toMatchObject({ selfHpLoss: 1 });
  });
});
