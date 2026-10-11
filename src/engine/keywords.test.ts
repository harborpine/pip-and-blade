import type { FaceDef, GameState } from '@shared';
import { IllegalActionError } from '@shared';
import { describe, expect, it } from 'vitest';
import { content, enemy, face, hero, item } from './testing/fixtures';
import { ally, END, fight, foe, play, use, withFaces } from './testing/harness';

/** Three heroes (20 HP) each with a uniform die of the given face. */
const party = (a: FaceDef, b: FaceDef = a, c: FaceDef = a, hp = 20) => [hero('bulwark', a, hp), hero('duelist', b, hp), hero('herbalist', c, hp)];
const enemyHp = (g: GameState, i = 0): number => g.run!.fight!.enemies[i]!.hp;
const heroHp = (g: GameState, i: number): number => g.run!.heroes[i]!.hp;
const hf = (g: GameState, i: number) => g.run!.fight!.heroes[i]!;
const attacker = (amount: number, hp = 30) => enemy('gnaw_rat', hp, [{ type: 'attack', amount, target: 'front' }]);

describe('face effects', () => {
  it('damage hits one enemy for its value', () => {
    const { engine, game } = fight();
    expect(enemyHp(play(engine, game, use(1, foe(game))))).toBe(27);
  });

  it('damage needs a living enemy as target', () => {
    const { engine, game } = fight();
    expect(() => engine.apply(game, use(1))).toThrow(IllegalActionError);
    expect(() => engine.apply(game, use(1, ally(0)))).toThrow(IllegalActionError);
    expect(() => engine.apply(game, use(1, { side: 'enemy', uid: 99 }))).toThrow(IllegalActionError);
  });

  it('shield protects until the start of the next turn', () => {
    const { engine, game } = fight({ content: content({ enemies: [attacker(3)] }) });
    let g = play(engine, game, use(0, ally(0)));
    expect(hf(g, 0).shield).toBe(2);
    g = play(engine, g, END);
    expect(heroHp(g, 0)).toBe(19);
    expect(hf(g, 0).shield).toBe(0);
    // unused shield also expires
    g = play(engine, g, use(0, ally(1)), END);
    expect(hf(g, 1).shield).toBe(0);
  });

  it('heal restores HP up to the maximum', () => {
    const { engine, game } = fight({ hp: [20, 10, 19] });
    let g = play(engine, game, use(2, ally(1)));
    expect(heroHp(g, 1)).toBe(12);
    g = play(engine, g, END, use(2, ally(2)));
    expect(heroHp(g, 2)).toBe(20);
  });

  it('weaken lowers each hit of the enemy this turn only', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('weaken', 2)), enemies: [attacker(5)] }) });
    let g = play(engine, game, use(0, foe(game)));
    expect(engine.forecast(g).heroes[0]!.hpLoss).toBe(3);
    g = play(engine, g, END);
    expect(heroHp(g, 0)).toBe(17);
    g = play(engine, g, END);
    expect(heroHp(g, 0)).toBe(12);
  });

  it('focus adds rerolls next turn and needs no target', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('focus', 1)) }) });
    expect(engine.dice(game)[0]!.needsTarget).toBe(false);
    expect(engine.previewDie(game, 0).rerollsNextTurn).toBe(1);
    const g = play(engine, game, use(0), use(1), END);
    expect(g.run!.fight!.rerollsLeft).toBe(4);
    expect(play(engine, g, END).run!.fight!.rerollsLeft).toBe(2);
  });

  it('blank can be used and does nothing', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('blank')) }) });
    const view = engine.dice(game)[0]!;
    expect(view).toMatchObject({ effect: 'blank', value: 0, symbol: null, needsTarget: false, usable: true });
    const g = play(engine, game, use(0));
    expect(enemyHp(g)).toBe(30);
    expect(g.run!.fight!.dice[0]!.used).toBe(true);
  });
});

describe('keywords', () => {
  it('Cleave damage hits every enemy without a target', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('damage', 3, ['cleave'])) }), enemies: ['gnaw_rat', 'gnaw_rat'] });
    expect(engine.dice(game)[0]).toMatchObject({ needsTarget: false, targets: [] });
    const g = play(engine, game, use(0));
    expect([enemyHp(g, 0), enemyHp(g, 1)]).toEqual([27, 27]);
  });

  it('Cleave shield and heal reach every living hero', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('shield', 2, ['cleave']), face('heal', 3, ['cleave'])) }), hp: [10, 10, 0] });
    game.run!.heroes[2]!.downed = true;
    const g = play(engine, game, use(0), use(1));
    expect([hf(g, 0).shield, hf(g, 1).shield, hf(g, 2).shield]).toEqual([2, 2, 0]);
    expect([heroHp(g, 0), heroHp(g, 1), heroHp(g, 2)]).toEqual([13, 13, 0]);
  });

  it('Echo copies the die to its left and adds its own value', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('damage', 3, ['pierce']), face('shield', 1, ['echo'], 'spark'), face('heal', 2)) }) });
    const v = engine.dice(game)[1]!;
    expect(v).toMatchObject({ effect: 'damage', value: 4, echoOf: 0, symbol: 'spark' });
    expect(v.keywords).toEqual(['pierce']);
    expect(enemyHp(play(engine, game, use(1, foe(game))))).toBe(26);
  });

  it('Echo with nobody to the left copies the die to its right', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('damage', 1, ['echo']), face('shield', 4), face('heal', 2)) }) });
    expect(engine.dice(game)[0]).toMatchObject({ effect: 'shield', value: 5, echoOf: 1 });
  });

  it('Echo of an Echo, of a blank, or with no neighbour is a blank', () => {
    const a = fight({ content: content({ heroes: party(face('damage', 1, ['echo']), face('damage', 1, ['echo']), face('heal', 2)) }) });
    expect(a.engine.dice(a.game)[1]).toMatchObject({ effect: 'blank', value: 0 });
    const b = fight({ content: content({ heroes: party(face('blank'), face('damage', 1, ['echo']), face('heal', 2)) }) });
    expect(b.engine.dice(b.game)[1]).toMatchObject({ effect: 'blank', value: 0 });
    const c = fight({ content: content({ heroes: party(face('damage', 2, ['echo'])) }), hp: [10, 0, 0] });
    c.game.run!.heroes[1]!.downed = true;
    c.game.run!.heroes[2]!.downed = true;
    const g = play(c.engine, c.game, END);
    expect(c.engine.dice(g)).toHaveLength(1);
    expect(c.engine.dice(g)[0]).toMatchObject({ effect: 'blank', echoOf: null });
  });

  it('Growth adds its step to that face for the rest of the fight', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('damage', 2, ['growth'])) }) });
    let g = play(engine, withFaces(game, [0, 0, 0]), use(0, foe(game)));
    expect(enemyHp(g)).toBe(28);
    expect(hf(g, 0).growth[0]).toBe(1);
    g = withFaces(play(engine, g, END), [0, 1, 1]);
    expect(engine.dice(g).map((d) => d.value)).toEqual([3, 2, 2]);
    g = play(engine, g, use(0, foe(g)));
    expect(enemyHp(g)).toBe(25);
    expect(hf(g, 0).growth[0]).toBe(2);
  });

  it('Reckless costs the user HP, ignores shield and never drops below 1', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('damage', 6, ['reckless']), face('shield', 5), face('damage', 6, ['reckless'])) }), hp: [20, 20, 2] });
    let g = play(engine, game, use(1, ally(0)));
    expect(engine.previewDie(g, 0, foe(g))).toMatchObject({ selfHpLoss: 2 });
    g = play(engine, g, use(0, foe(g)));
    expect(heroHp(g, 0)).toBe(18);
    expect(hf(g, 0).shield).toBe(5);
    g = play(engine, g, use(2, foe(g)));
    expect(heroHp(g, 2)).toBe(1);
    expect(g.run!.heroes[2]!.downed).toBe(false);
    expect(enemyHp(g)).toBe(18);
  });

  it('Pierce ignores shield', () => {
    const c = content({ heroes: party(face('damage', 3, ['pierce']), face('damage', 3)), enemies: [enemy('gnaw_rat', 30, undefined, { startShield: 5 })] });
    const { engine, game } = fight({ content: c });
    let g = play(engine, game, use(0, foe(game)));
    expect([enemyHp(g), g.run!.fight!.enemies[0]!.shield]).toEqual([27, 5]);
    g = play(engine, g, use(1, foe(g)));
    expect([enemyHp(g), g.run!.fight!.enemies[0]!.shield]).toEqual([27, 2]);
  });

  it('Venom applies poison instead of damage; poison ticks in the enemy phase ignoring shield', () => {
    const c = content({ heroes: party(face('damage', 3, ['venom'])), enemies: [enemy('gnaw_rat', 30, undefined, { startShield: 9 })] });
    const { engine, game } = fight({ content: c });
    let g = play(engine, game, use(0, foe(game)));
    expect(engine.previewDie(game, 0, foe(game)).hits[0]).toMatchObject({ hpLoss: 0, poison: 3 });
    expect(enemyHp(g)).toBe(30);
    expect(g.run!.fight!.enemies[0]!.statuses.poison).toBe(3);
    g = play(engine, g, END);
    expect(enemyHp(g)).toBe(27);
    expect(g.run!.fight!.enemies[0]!.statuses.poison).toBe(2);
    g = play(engine, g, END, END);
    expect(enemyHp(g)).toBe(24);
    expect(g.run!.fight!.enemies[0]!.statuses.poison).toBeUndefined();
  });

  it('Ward shield does not expire and is spent after normal shield', () => {
    const c = content({ heroes: party(face('shield', 3, ['ward']), face('shield', 2)), enemies: [enemy('gnaw_rat', 30, [{ type: 'charge' }, { type: 'attack', amount: 4, target: 'front' }].map((a, i) => ({ id: `m${i}`, name: '', actions: [a as never] })))] });
    const { engine, game } = fight({ content: c });
    let g = play(engine, game, use(0, ally(0)), END);
    expect(hf(g, 0)).toMatchObject({ shield: 0, ward: 3 });
    g = play(engine, g, use(1, ally(0)));
    expect(engine.forecast(g).heroes[0]).toMatchObject({ hpLoss: 0, shieldLoss: 4 });
    g = play(engine, g, END);
    expect(hf(g, 0)).toMatchObject({ shield: 0, ward: 1 });
    expect(heroHp(g, 0)).toBe(20);
  });

  it('Twin resolves twice', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('damage', 3, ['twin'])) }) });
    expect(engine.previewDie(game, 0, foe(game)).hits[0]!.hpLoss).toBe(6);
    expect(enemyHp(play(engine, game, use(0, foe(game))))).toBe(24);
  });

  it('Rally gives every other unused die its bonus for the turn', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('damage', 2), face('heal', 1, ['rally']), face('damage', 2)) }) });
    let g = play(engine, game, use(0, foe(game)), use(1, ally(0)));
    expect(engine.dice(g).map((d) => d.value)).toEqual([2, 1, 3]);
    g = play(engine, g, use(2, foe(g)));
    expect(enemyHp(g)).toBe(25);
    expect(engine.dice(play(engine, g, END)).map((d) => d.value)).toEqual([2, 1, 2]);
  });

  it('Momentum grows with each reroll spent this turn', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('damage', 2, ['momentum'])) }) });
    expect(engine.dice(game)[0]!.value).toBe(2);
    let g = play(engine, game, { type: 'reroll' });
    expect(engine.dice(g)[0]!.value).toBe(3);
    g = play(engine, g, { type: 'reroll' });
    expect(engine.dice(g)[0]!.value).toBe(4);
    expect(enemyHp(play(engine, g, use(0, foe(g))))).toBe(26);
  });

  it('Poised applies only while no reroll has been spent', () => {
    const { engine, game } = fight({ content: content({ heroes: party(face('damage', 2, ['poised'])) }) });
    expect(engine.dice(game)[0]!.value).toBe(4);
    expect(engine.dice(play(engine, game, { type: 'reroll' }))[0]!.value).toBe(2);
  });

  it('Execute multiplies damage against targets at or below half HP', () => {
    const c = content({ heroes: party(face('damage', 3, ['execute'])), enemies: [enemy('gnaw_rat', 30), enemy('mud_slime', 30)], encounters: [{ id: 'e', act: 1, kind: 'normal', enemies: ['gnaw_rat', 'mud_slime'] }] });
    const { engine, game } = fight({ content: c });
    game.run!.fight!.enemies[1]!.hp = 15;
    const g = play(engine, game, use(0, foe(game, 0)), use(1, foe(game, 1)));
    expect([enemyHp(g, 0), enemyHp(g, 1)]).toEqual([27, 9]);
  });
});

describe('value pipeline', () => {
  it('applies steps in order: base, face bonuses, keywords, rerolled bonus, die bonus, then multipliers, rounded down', () => {
    const c = content({
      heroes: party(face('damage', 3, ['momentum'])),
      items: [
        item('whetstone', { modifiers: [{ type: 'faceValue', amount: 1, filter: { effect: ['damage'] }, scope: 'owner' }] }),
        item('loaded_pip', { modifiers: [{ type: 'rerolledBonus', amount: 1, scope: 'party' }] }),
        item('first_pick_glove', { modifiers: [{ type: 'firstLockMultiplier', factor: 1.5 }] }),
      ],
    });
    const { engine, game } = fight({ content: c, items: [['whetstone', 'loaded_pip'], ['first_pick_glove']] });
    // die 0: base 3 +1 whetstone; reroll once: +1 momentum, +1 rerolled = 6; then lock first: x1.5 = 9
    let g = play(engine, game, { type: 'reroll' }, { type: 'toggleLock', die: 0 });
    expect(engine.dice(g).map((d) => d.value)).toEqual([9, 5, 5]);
    g.run!.fight!.dice[0]!.bonus = 1; // (6 + 1) x 1.5 = 10.5, rounded down
    expect(engine.dice(g)[0]!.value).toBe(10);
    g = play(engine, g, use(0, foe(g)));
    expect(enemyHp(g)).toBe(20);
  });

  it('never goes below zero', () => {
    const c = content({ items: [item('whetstone', { modifiers: [{ type: 'faceValue', amount: -9, scope: 'party' }] })] });
    const { engine, game } = fight({ content: c, items: [['whetstone']] });
    expect(engine.dice(game).map((d) => d.value)).toEqual([0, 0, 0]);
  });
});
