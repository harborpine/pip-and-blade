import { CONTENT } from '@content';
import { createEngine } from '@engine';
import { describe, expect, it } from 'vitest';
import { carelessBot } from './careless';
import { dieValue } from './draft';
import { worstMoveOnOneHero } from './fairness';
import { orderParty } from './jobs';
import { averageOver, findSet } from './model';
import { makeRng } from './rng';
import { fullProfile, playRun } from './runner';
import { skilledBot } from './skilled';

describe('bot helpers', () => {
  it('seeded rng is repeatable and in range', () => {
    const a = makeRng('x');
    const b = makeRng('x');
    for (let i = 0; i < 50; i++) {
      const v = a.next();
      expect(v).toBe(b.next());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(makeRng('y').next()).not.toBe(makeRng('x').next());
  });

  it('finds pairs, triples and rainbows the way the rules describe', () => {
    const none = [false, false, false];
    expect(findSet(['blade', 'blade', 'guard'], none, CONTENT.sets, false)?.kind).toBe('pair');
    expect(findSet(['blade', 'blade', 'blade'], none, CONTENT.sets, false)?.kind).toBe('triple');
    expect(findSet(['blade', 'guard', 'heart'], none, CONTENT.sets, false)).toBeNull();
    expect(findSet(['blade', 'guard', 'heart'], none, CONTENT.sets, true)?.kind).toBe('rainbow');
    expect(findSet(['blade', null, 'guard'], none, CONTENT.sets, true)).toBeNull();
    // A wild die completes the best set.
    expect(findSet(['blade', 'blade', null], [false, false, true], CONTENT.sets, false)?.kind).toBe('triple');
  });

  it('averages a value table over the rerolled dice only', () => {
    const n = 2;
    const table = new Float64Array(36);
    for (let i = 0; i < 36; i++) table[i] = i % 6; // value = face of die 0
    const overDie0 = averageOver(table, n, 0b01);
    expect(overDie0[0]).toBeCloseTo(2.5);
    expect(overDie0[35]).toBeCloseTo(2.5);
    const overDie1 = averageOver(table, n, 0b10);
    expect(overDie1[4]).toBeCloseTo(4);
  });

  it('values a die mostly by its best faces', () => {
    expect(dieValue([6, 0, 0, 0, 0, 0])).toBeGreaterThan(dieValue([1, 1, 1, 1, 1, 1]));
    expect(dieValue([3, 3, 3, 3, 3, 3])).toBeCloseTo(3);
  });

  it('measures the worst single-hero hit of an enemy move, including poison', () => {
    const brute = CONTENT.enemies.find((e) => e.id === 'mushroom_brute')!;
    expect(worstMoveOnOneHero(brute)).toBe(3);
  });

  it('puts the toughest hero in front and the Automaton last', () => {
    const engine = createEngine(CONTENT);
    expect(orderParty(engine, ['automaton', 'herbalist', 'bulwark'])).toEqual(['bulwark', 'herbalist', 'automaton']);
  });
});

describe('bots play whole runs through the public engine', () => {
  const engine = createEngine(CONTENT);
  it('careless bot finishes a run', () => {
    const env = { engine, content: CONTENT, rng: makeRng('t1') };
    const { result } = playRun(env, carelessBot, engine.newProfile(), ['bulwark', 'duelist', 'herbalist'], 0, 'test-careless');
    expect(result.turns).toBeGreaterThan(0);
  });
  it('skilled bot finishes a run and is deterministic', () => {
    const play = (): number => {
      const env = { engine, content: CONTENT, rng: makeRng('t2') };
      return playRun(env, skilledBot({ strategy: null }), fullProfile(engine), ['bulwark', 'hexer', 'automaton'], 0, 'test-skilled').result.turns;
    };
    const a = play();
    expect(a).toBeGreaterThan(0);
    expect(play()).toBe(a);
  });
});
