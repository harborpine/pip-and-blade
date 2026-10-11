import type { Action, GameState } from '@shared';
import { IllegalActionError } from '@shared';
import { describe, expect, it } from 'vitest';
import { createEngine } from './index';
import { content, enemy, face, fullContent, hero, item, move } from './testing/fixtures';
import { ally, END, fight, foe, play, toNextFight, use, withFaces } from './testing/harness';

const fightOf = (g: GameState) => g.run!.fight!;
const START: Extract<Action, { type: 'startRun' }> = { type: 'startRun', heroes: ['bulwark', 'duelist', 'herbalist'], tier: 0 };

function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v)) deepFreeze((v as Record<string, unknown>)[k]);
  }
  return v;
}

describe('rolling', () => {
  const engine = createEngine(fullContent());

  it('the same seed gives the same dice; another seed gives another fight', () => {
    const a = engine.apply(engine.newGame(), { ...START, seed: 'one' }).game;
    const b = engine.apply(engine.newGame(), { ...START, seed: 'one' }).game;
    expect(a).toEqual(b);
    const rolls = new Set<string>();
    for (let i = 0; i < 20; i++) rolls.add(fightOf(engine.apply(engine.newGame(), { ...START, seed: `s${i}` }).game).dice.map((d) => d.face).join(''));
    expect(rolls.size).toBeGreaterThan(5);
  });

  it('a fight starts on turn 1, rolling, with one die per hero, full rerolls and every intent set', () => {
    const g = engine.apply(engine.newGame(), { ...START, seed: 'x' }).game;
    const f = fightOf(g);
    expect(f).toMatchObject({ turn: 1, phase: 'rolling', rerollsLeft: 2, rerollsSpent: 0 });
    expect(f.dice.map((d) => d.hero)).toEqual([0, 1, 2]);
    expect(f.enemies.every((e) => e.intent !== null)).toBe(true);
  });

  it('reroll changes only dice that are not locked, costs one reroll and marks them rerolled', () => {
    let g = engine.apply(engine.newGame(), { ...START, seed: 'lock' }).game;
    g = play(engine, g, { type: 'toggleLock', die: 1 });
    const before = fightOf(g).dice[1]!.face;
    const seen = new Set<number>();
    for (let i = 0; i < 2; i++) {
      g = play(engine, g, { type: 'reroll' });
      seen.add(fightOf(g).dice[0]!.face);
    }
    const f = fightOf(g);
    expect(f.dice[1]).toMatchObject({ face: before, rerolled: false, locked: true });
    expect(f.dice[0]!.rerolled).toBe(true);
    expect(f).toMatchObject({ rerollsLeft: 0, rerollsSpent: 2 });
    expect(engine.canApply(g, { type: 'reroll' })).toBe(false);
    expect(() => engine.apply(g, { type: 'reroll' })).toThrow(IllegalActionError);
  });

  it('cannot reroll when every die is locked, nor once acting has begun', () => {
    let g = engine.apply(engine.newGame(), { ...START, seed: 'all' }).game;
    const locked = play(engine, g, { type: 'toggleLock', die: 0 }, { type: 'toggleLock', die: 1 }, { type: 'toggleLock', die: 2 });
    expect(engine.whyIllegal(locked, { type: 'reroll' })).toMatch(/no dice/);
    g = play(engine, withFaces(g, [5, 5, 5]), use(0));
    expect(fightOf(g).phase).toBe('acting');
    expect(engine.canApply(g, { type: 'reroll' })).toBe(false);
    expect(engine.canApply(g, { type: 'toggleLock', die: 1 })).toBe(false);
  });

  it('the first die locked keeps the firstLocked flag for the turn, and no other die can get it', () => {
    let g = engine.apply(engine.newGame(), { ...START, seed: 'first' }).game;
    g = play(engine, g, { type: 'toggleLock', die: 2 }, { type: 'toggleLock', die: 2 }, { type: 'toggleLock', die: 0 });
    expect(fightOf(g).dice.map((d) => d.firstLocked)).toEqual([false, false, true]);
    expect(fightOf(g).dice.map((d) => d.locked)).toEqual([true, false, false]);
    g = play(engine, g, END);
    expect(fightOf(g).dice.every((d) => !d.firstLocked && !d.locked)).toBe(true);
  });

  it('rerolls are final: there is nothing to undo while rolling', () => {
    const g = play(engine, engine.apply(engine.newGame(), { ...START, seed: 'final' }).game, { type: 'reroll' });
    expect(engine.canApply(g, { type: 'undo' })).toBe(false);
  });
});

describe('acting and undo', () => {
  it('a die can be used once, and using the first die ends rolling', () => {
    const { engine, game } = fight();
    const g = play(engine, game, use(1, foe(game)));
    expect(fightOf(g)).toMatchObject({ phase: 'acting', diceUsed: 1 });
    expect(engine.dice(g)[1]).toMatchObject({ used: true, usable: false });
    expect(() => engine.apply(g, use(1, foe(g)))).toThrow(IllegalActionError);
    expect(() => engine.apply(g, use(7))).toThrow(IllegalActionError);
  });

  it('undo steps back one die at a time, all the way to the rolling phase, exactly', () => {
    const { engine, game } = fight();
    const s0 = play(engine, game, { type: 'reroll' }, { type: 'toggleLock', die: 0 });
    const s1 = play(engine, s0, use(1, foe(s0)));
    const s2 = play(engine, s1, use(0, ally(2)));
    expect(play(engine, s2, { type: 'undo' })).toEqual(s1);
    const back = play(engine, s2, { type: 'undo' }, { type: 'undo' });
    expect(back).toEqual(s0);
    expect(fightOf(back)).toMatchObject({ phase: 'rolling', rerollsLeft: 1 });
    expect(engine.canApply(back, { type: 'undo' })).toBe(false);
    expect(engine.canApply(back, { type: 'reroll' })).toBe(true);
  });

  it('undo never crosses End Turn', () => {
    const { engine, game } = fight();
    const g = play(engine, game, use(1, foe(game)), END);
    expect(fightOf(g).undo).toEqual([]);
    expect(engine.canApply(g, { type: 'undo' })).toBe(false);
  });

  it('apply never mutates the state it is given', () => {
    const engine = createEngine(fullContent());
    let g = deepFreeze(engine.apply(deepFreeze(engine.newGame()), { ...START, seed: 'frozen' }).game);
    for (let i = 0; i < 400 && g.run; i++) {
      const acts = engine.legalActions(g);
      engine.dice(g);
      engine.forecast(g);
      g = deepFreeze(engine.apply(g, acts[(i * 7) % acts.length]!).game);
    }
    expect(true).toBe(true);
  });

  it('actions that do not fit the phase are rejected', () => {
    const { engine, game } = fight();
    for (const a of [{ type: 'skipReward' }, { type: 'pickDoor', door: 0 }, { type: 'leave' }, { type: 'continue' }, { type: 'restHeal' }, { type: 'eventChoice', choice: 0 }, START] as Action[]) {
      expect(engine.canApply(game, a)).toBe(false);
      expect(() => engine.apply(game, a)).toThrow(IllegalActionError);
    }
    expect(engine.canApply(engine.newGame(), END)).toBe(false);
    expect(engine.dice(engine.newGame())).toEqual([]);
  });
});

describe('enemy phase', () => {
  it('enemies act front to back and the forecast matches what happens', () => {
    const c = content({
      enemies: [enemy('gnaw_rat', 30, [{ type: 'attack', amount: 3, target: 'front' }]), enemy('twig_archer', 30, [{ type: 'attack', amount: 2, target: 'all', hits: 2 }])],
    });
    const { engine, game } = fight({ content: c, enemies: ['gnaw_rat', 'twig_archer'] });
    const g0 = play(engine, game, use(0, ally(0)));
    const fc = engine.forecast(g0);
    expect(fc.heroes.map((h) => h.hpLoss)).toEqual([5, 4, 4]);
    expect(fc.heroes[0]!.shieldLoss).toBe(2);
    expect(fc.partyWipe).toBe(false);
    const res = engine.apply(g0, END);
    expect(res.game.run!.heroes.map((h) => h.hp)).toEqual([15, 16, 16]);
    expect(res.events.filter((e) => e.type === 'enemyActs').map((e) => (e.type === 'enemyActs' ? e.uid : 0))).toEqual([1, 2]);
    expect(fightOf(res.game).turn).toBe(2);
  });

  it('enemy shield lasts through the player turn and is removed just before that enemy acts again', () => {
    const c = content({ enemies: [enemy('gnaw_rat', 30, [move('guard', { type: 'shield', amount: 4, target: 'self' }), move('wait', { type: 'charge' })])] });
    const { engine, game } = fight({ content: c });
    let g = play(engine, game, END);
    expect(fightOf(g).enemies[0]!.shield).toBe(4);
    g = play(engine, g, use(1, foe(g)));
    expect(fightOf(g).enemies[0]).toMatchObject({ hp: 30, shield: 1 });
    g = play(engine, g, END);
    expect(fightOf(g).enemies[0]!.shield).toBe(0);
  });

  it('an enemy killed by poison at the start of the enemy phase does not act', () => {
    const c = content({ heroes: [hero('bulwark', face('damage', 4, ['venom'])), hero('duelist', face('blank')), hero('herbalist', face('blank'))], enemies: [enemy('gnaw_rat', 4, [{ type: 'attack', amount: 9, target: 'front' }]), enemy('mud_slime', 30)] });
    const { engine, game } = fight({ content: c, enemies: ['gnaw_rat', 'mud_slime'] });
    const g0 = play(engine, game, use(0, foe(game)));
    expect(engine.forecast(g0).heroes[0]!.hpLoss).toBe(0);
    const g = play(engine, g0, END);
    expect(g.run!.heroes[0]!.hp).toBe(20);
    expect(fightOf(g).enemies.map((e) => e.enemyId)).toEqual(['mud_slime']);
  });

  it('a single-target intent whose hero is already down retargets to the front living hero', () => {
    const c = content({ enemies: [enemy('gnaw_rat', 30, [{ type: 'attack', amount: 5, target: 'front' }]), enemy('twig_archer', 30, [{ type: 'attack', amount: 4, target: 'front' }])] });
    const { engine, game } = fight({ content: c, enemies: ['gnaw_rat', 'twig_archer'], hp: [3, 20, 20] });
    const fc = engine.forecast(game);
    expect(fc.heroes.map((h) => h.hpLoss)).toEqual([3, 4, 0]);
    expect(fc.heroes[0]!.downed).toBe(true);
    const g = play(engine, game, END);
    expect(g.run!.heroes.map((h) => h.hp)).toEqual([0, 16, 20]);
    expect(g.run!.heroes[0]!.downed).toBe(true);
    expect(fightOf(g).dice.map((d) => d.hero)).toEqual([1, 2]);
    expect(fightOf(g).enemies[0]!.intent!.actions[0]!.heroes).toEqual([1]);
  });

  it('hero poison ticks after enemies act and ignores shield', () => {
    const c = content({ enemies: [enemy('gnaw_rat', 30, [{ type: 'attack', amount: 1, target: 'front', poison: 2 }])] });
    const { engine, game } = fight({ content: c });
    let g = play(engine, game, use(0, ally(0)));
    expect(engine.forecast(g).heroes[0]).toMatchObject({ hpLoss: 2, shieldLoss: 1 });
    g = play(engine, g, END);
    expect(g.run!.heroes[0]!.hp).toBe(18);
    expect(fightOf(g).heroes[0]!.statuses.poison).toBe(1);
  });
});

describe('winning and losing a fight', () => {
  it('the fight is won the instant the last enemy dies; unused dice are forfeited', () => {
    const c = content({ enemies: [enemy('gnaw_rat', 3)] });
    const { engine, game } = fight({ content: c });
    expect(engine.previewDie(game, 1, foe(game)).hits[0]).toMatchObject({ hpLoss: 3, kills: true });
    const res = engine.apply(game, use(1, foe(game)));
    expect(res.game.run!.fight).toBeNull();
    expect(res.game.run!.fightsWon).toBe(1);
    expect(res.game.run!.phase).not.toBe('fight');
    expect(res.events.map((e) => e.type)).toContain('fightWon');
  });

  it('the run is lost when every hero is down; continue clears the run', () => {
    const c = content({ enemies: [enemy('gnaw_rat', 30, [{ type: 'attack', amount: 50, target: 'all' }])] });
    const { engine, game } = fight({ content: c });
    expect(engine.forecast(game)).toMatchObject({ partyWipe: true });
    const res = engine.apply(game, END);
    expect(res.game.run!.phase).toBe('defeat');
    expect(res.events).toContainEqual({ type: 'runEnded', won: false, score: 0 });
    expect(engine.legalActions(res.game)).toEqual([{ type: 'continue' }]);
    expect(engine.apply(res.game, { type: 'continue' }).game.run).toBeNull();
  });

  it('a downed hero has no die for the rest of the fight and returns next fight at partial HP', () => {
    const c = content({
      heroes: [hero('bulwark', face('shield', 2), 20), hero('duelist', face('damage', 30), 20), hero('herbalist', face('heal', 2), 20)],
      enemies: [enemy('gnaw_rat', 30, [{ type: 'attack', amount: 25, target: 'front' }])],
      doors: [{ kind: 'onward', name: '', text: '', weight: [1, 1, 1] }],
    });
    const { engine, game } = fight({ content: c });
    let g = play(engine, game, END);
    expect(g.run!.heroes[0]).toMatchObject({ hp: 0, downed: true });
    expect(engine.dice(g).map((d) => d.hero)).toEqual([1, 2]);
    expect(engine.canApply(g, use(1, ally(0)))).toBe(false);
    g = play(engine, g, use(0, foe(g)));
    expect(g.run!.heroes[0]!.downed).toBe(true);
    g = toNextFight(engine, g);
    expect(g.run!.heroes[0]).toMatchObject({ hp: 10, downed: false });
    expect(engine.dice(g)).toHaveLength(3);
  });

  it('return HP uses the downedReturnHpPct rule plus returnHpPct items', () => {
    const c = content({ items: [item('field_medic_kit', { modifiers: [{ type: 'returnHpPct', amount: 25 }] })] });
    const { engine, game } = fight({ content: c, items: [[], ['field_medic_kit']] });
    game.run!.heroes[0]!.downed = true;
    game.run!.heroes[0]!.hp = 0;
    let g = play(engine, game, END);
    g.run!.fight!.enemies[0]!.hp = 1;
    g = play(engine, g, use(0, foe(g)));
    g = toNextFight(engine, g);
    expect(g.run!.heroes[0]).toMatchObject({ hp: 15, downed: false });
  });
});
