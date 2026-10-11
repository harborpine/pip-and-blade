import { describe, expect, it } from 'vitest';
import { createEngine } from './index';
import { content, enemy, face, hero } from './testing/fixtures';

describe('a headless fight through apply', () => {
  const engine = createEngine(content({
    heroes: [hero('bulwark', face('shield', 2)), hero('duelist', face('damage', 5)), hero('herbalist', face('damage', 5))],
    enemies: [enemy('gnaw_rat', 12, [{ type: 'attack', amount: 3, target: 'front' }])],
  }));

  it('plays from startRun to a won fight, with exact previews', () => {
    let game = engine.apply(engine.newGame(), { type: 'startRun', heroes: ['bulwark', 'duelist', 'herbalist'], tier: 0, seed: 'abc' }).game;
    expect(game.run?.phase).toBe('fight');
    expect(engine.dice(game)).toHaveLength(3);
    expect(engine.forecast(game).heroes[0]).toMatchObject({ hpLoss: 3, downed: false });
    const rat = { side: 'enemy' as const, uid: game.run!.fight!.enemies[0]!.uid };
    game = engine.apply(game, { type: 'useDie', die: 0, target: { side: 'hero', index: 0 } }).game;
    expect(engine.forecast(game).heroes[0]).toMatchObject({ hpLoss: 1, shieldLoss: 2 });
    expect(engine.previewDie(game, 1, rat).hits[0]).toMatchObject({ hpLoss: 5, kills: false });
    game = engine.apply(game, { type: 'useDie', die: 1, target: rat }).game;
    game = engine.apply(game, { type: 'endTurn' }).game;
    expect(game.run!.heroes[0]!.hp).toBe(19);
    expect(game.run!.fight!.turn).toBe(2);
    game = engine.apply(game, { type: 'useDie', die: 1, target: rat }).game;
    const res = engine.apply(game, { type: 'useDie', die: 2, target: rat });
    expect(res.events.some((e) => e.type === 'fightWon')).toBe(true);
    expect(res.game.run!.fight).toBeNull();
    expect(res.game.run!.gold).toBe(10);
  });
  it('startRun without a seed still gives a different run each time', () => {
    const heroes = ['bulwark', 'duelist', 'herbalist'] as ['bulwark', 'duelist', 'herbalist'];
    let game = engine.apply(engine.newGame(), { type: 'startRun', heroes, tier: 0 }).game;
    const first = game.run!.seed;
    game = engine.apply(game, { type: 'abandonRun' }).game;
    game = engine.apply(game, { type: 'startRun', heroes, tier: 0 }).game;
    const second = game.run!.seed;
    game = engine.apply(engine.apply(game, { type: 'abandonRun' }).game, { type: 'startRun', heroes, tier: 0 }).game;
    expect(new Set([first, second, game.run!.seed]).size).toBe(3);
    // and it is still deterministic: the same profile state gives the same seed
    expect(engine.apply(engine.newGame(), { type: 'startRun', heroes, tier: 0 }).game.run!.seed).toBe(first);
  });
});
