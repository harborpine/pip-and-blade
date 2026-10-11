import type { ContentDB, GameState } from '@shared';
import { describe, expect, it } from 'vitest';
import { content, enemy, face, hero, move } from './testing/fixtures';
import { ally, END, fight, foe, play, use } from './testing/harness';

const F = (g: GameState) => g.run!.fight!;
const withFury = (over: Partial<ContentDB> = {}, fury: ContentDB['rules']['fury'] = { fromTurn: 2, strengthPerTurn: 2 }): ContentDB => {
  const c = content({ enemies: [enemy('gnaw_rat', 60, [{ type: 'attack', amount: 3, target: 'front' }])], ...over });
  return { ...c, rules: { ...c.rules, fury } };
};

describe('Fury (Rules.fury)', () => {
  it('from the configured turn, enemies gain Strength before acting, and the shown intent and forecast already include it', () => {
    const { engine, game } = fight({ content: withFury() });
    expect(F(game).enemies[0]!.intent!.actions[0]!.amount).toBe(3);
    expect(engine.forecast(game).heroes[0]!.hpLoss).toBe(3);
    const t1 = engine.apply(game, END);
    expect(t1.events.some((e) => e.type === 'status')).toBe(false);
    let g = t1.game;
    expect(g.run!.heroes[0]!.hp).toBe(17);
    expect(F(g).enemies[0]!.statuses.strength).toBeUndefined();
    // turn 2 is a fury turn: the intent shows 3 + 2 although the Strength is not there yet
    expect(F(g).enemies[0]!.intent!.actions[0]!.amount).toBe(5);
    expect(engine.forecast(g).heroes[0]!.hpLoss).toBe(5);
    const t2 = engine.apply(g, END);
    expect(t2.events).toContainEqual({ type: 'status', target: { side: 'enemy', uid: 1 }, status: 'strength', amount: 2 });
    g = t2.game;
    expect(g.run!.heroes[0]!.hp).toBe(12);
    expect(F(g).enemies[0]!.statuses.strength).toBe(2);
    expect(F(g).enemies[0]!.intent!.actions[0]!.amount).toBe(7);
    expect(engine.forecast(g).heroes[0]!.hpLoss).toBe(7);
    expect(play(engine, g, END).run!.heroes[0]!.hp).toBe(5);
  });

  it('applies on turn 1 when fromTurn is 1, to every living enemy, including ones that never attack', () => {
    const c = withFury({ enemies: [enemy('gnaw_rat', 60, [{ type: 'attack', amount: 1, target: 'all', hits: 2 }]), enemy('mud_slime', 60)] }, { fromTurn: 1, strengthPerTurn: 1 });
    const { engine, game } = fight({ content: c, enemies: ['gnaw_rat', 'mud_slime'] });
    expect(F(game).enemies[0]!.intent!.actions[0]!.amount).toBe(2);
    expect(engine.forecast(game).heroes.map((h) => h.hpLoss)).toEqual([4, 4, 4]);
    const g = play(engine, game, END);
    expect(g.run!.heroes.map((h) => h.hp)).toEqual([16, 16, 16]);
    expect(F(g).enemies.map((e) => e.statuses.strength)).toEqual([1, 1]);
  });

  it('forecast equals what happens on a fury turn with shield, weaken and a strength buff in play', () => {
    const c = withFury({
      heroes: [hero('bulwark', face('shield', 4)), hero('duelist', face('weaken', 1)), hero('herbalist', face('damage', 2))],
      enemies: [enemy('gnaw_rat', 60, [move('buff', { type: 'status', status: 'strength', amount: 1, target: 'allAllies', side: 'enemy' })]), enemy('mud_slime', 60, [{ type: 'attack', amount: 3, target: 'front', hits: 2 }])],
    });
    const { engine, game } = fight({ content: c, enemies: ['gnaw_rat', 'mud_slime'] });
    let g = play(engine, game, END); // turn 1: buff +1, then two hits of 4
    expect(g.run!.heroes[0]!.hp).toBe(12);
    expect(F(g).enemies[1]!.intent!.actions[0]!.amount).toBe(6); // 3 + 1 strength + 2 fury (the coming buff is in the forecast, not the intent)
    g = play(engine, g, use(0, ally(0)), use(1, foe(g, 1)));
    const fc = engine.forecast(g);
    expect(fc.heroes[0]).toMatchObject({ hpLoss: 8, shieldLoss: 4 }); // (3 + 1 + 2 fury + 1 buff - 1 weak) x 2 = 12, minus 4 shield
    const after = play(engine, g, END);
    expect(g.run!.heroes[0]!.hp - after.run!.heroes[0]!.hp).toBe(fc.heroes[0]!.hpLoss);
    expect(F(after).enemies.map((e) => e.statuses.strength)).toEqual([4, 4]);
  });

  it('undo and a save round-trip on a fury turn change nothing', () => {
    const { engine, game } = fight({ content: withFury({ heroes: [hero('bulwark', face('shield', 2)), hero('duelist', face('damage', 3)), hero('herbalist', face('heal', 2))] }) });
    const g = play(engine, game, END);
    const used = play(engine, g, use(0, ally(0)), use(1, foe(g)));
    expect(play(engine, used, { type: 'undo' }, { type: 'undo' })).toEqual(g);
    const back = engine.load(engine.save({ app: 'pip-and-blade', version: 1, game: used, settings: { reduceMotion: false } })).game;
    expect(back).toEqual(used);
    expect(engine.forecast(back)).toEqual(engine.forecast(used));
    expect(engine.forecast(used).heroes[0]).toMatchObject({ hpLoss: 3, shieldLoss: 2 });
    expect(engine.apply(back, END)).toEqual(engine.apply(used, END));
    expect(play(engine, used, END).run!.heroes[0]!.hp).toBe(14);
  });

  it('an intent re-picked mid-turn (HP phase change) also shows the fury amount', () => {
    const boss = enemy('drowned_bell', 20, [move('a', { type: 'charge' }), move('b', { type: 'attack', amount: 4, target: 'front' })], {
      ai: { type: 'cycle', order: ['a'] }, phases: [{ hpAtMostPct: 50, ai: { type: 'cycle', order: ['b'] } }],
    });
    const c = withFury({ enemies: [boss], heroes: [hero('bulwark', face('damage', 10)), hero('duelist', face('heal', 1)), hero('herbalist', face('heal', 1))] }, { fromTurn: 1, strengthPerTurn: 3 });
    const { engine, game } = fight({ content: c, enemies: ['drowned_bell'] });
    const g = play(engine, game, use(0, foe(game)));
    expect(F(g).enemies[0]!.intent).toMatchObject({ moveId: 'b', actions: [{ amount: 7 }] });
    expect(engine.forecast(g).heroes[0]!.hpLoss).toBe(7);
    expect(play(engine, g, END).run!.heroes[0]!.hp).toBe(13);
  });

  it('no fury rule means no change', () => {
    const c = content({ enemies: [enemy('gnaw_rat', 60, [{ type: 'attack', amount: 3, target: 'front' }])] });
    const { engine, game } = fight({ content: c });
    const g = play(engine, game, END, END, END, END);
    expect(g.run!.heroes[0]!.hp).toBe(8);
    expect(F(g).enemies[0]!.statuses.strength).toBeUndefined();
  });
});
