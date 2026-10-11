import type { ContentDB, FaceDef, GameState } from '@shared';
import { describe, expect, it } from 'vitest';
import { content, enemy, face, hero, item, SETS } from './testing/fixtures';
import { END, fight, foe, play, use } from './testing/harness';

const party = (a: FaceDef, b: FaceDef, c: FaceDef) => [hero('bulwark', a), hero('duelist', b), hero('herbalist', c)];
const blade = (v = 2): FaceDef => face('damage', v);
const guard = (v = 2): FaceDef => face('shield', v);
const heart = (v = 2): FaceDef => face('heal', v);
const withSets = (over: Partial<ContentDB>): ContentDB => content({ sets: SETS, ...over });
const values = (engine: ReturnType<typeof fight>['engine'], g: GameState): number[] => engine.dice(g).map((d) => d.value);

describe('sets', () => {
  it('a pair gives each of its two dice the pair bonus, previewed while still rolling', () => {
    const { engine, game } = fight({ content: withSets({ heroes: party(blade(), heart(), blade()) }) });
    expect(engine.previewSets(game)).toEqual([{ kind: 'pair', symbol: 'blade', dice: [0, 2] }]);
    expect(game.run!.fight!.sets).toEqual([]);
    expect(values(engine, game)).toEqual([3, 2, 3]);
    const res = engine.apply(game, use(0, foe(game)));
    expect(res.events).toContainEqual({ type: 'setsFormed', sets: [{ kind: 'pair', symbol: 'blade', dice: [0, 2] }] });
    expect(res.game.run!.fight!.enemies[0]!.hp).toBe(27);
    expect(res.game.run!.fight!.sets).toHaveLength(1);
    expect(res.game.run!.stats.turn.pairsFormed).toBe(1);
  });

  it('a triple gives the larger bonus and fires the symbol burst once', () => {
    const { engine, game } = fight({ content: withSets({ heroes: party(blade(), blade(), blade()) }), enemies: ['gnaw_rat', 'gnaw_rat'] });
    expect(values(engine, game)).toEqual([4, 4, 4]);
    expect(engine.previewDie(game, 0, foe(game, 0)).hits.map((h) => h.hpLoss)).toEqual([6, 2]);
    let g = play(engine, game, use(0, foe(game, 0)));
    expect(g.run!.fight!.enemies.map((e) => e.hp)).toEqual([24, 28]);
    g = play(engine, g, use(1, foe(g, 1)));
    expect(g.run!.fight!.enemies.map((e) => e.hp)).toEqual([24, 24]);
    expect(g.run!.stats.fight.triplesFormed).toBe(1);
  });

  it('sets also form (and bursts fire) when the turn is ended without using a die', () => {
    const c = withSets({ heroes: party(guard(), guard(), guard()), enemies: [enemy('gnaw_rat', 30, [{ type: 'attack', amount: 3, target: 'all' }])] });
    const { engine, game } = fight({ content: c });
    expect(engine.forecast(game).heroes.map((h) => h.hpLoss)).toEqual([1, 1, 1]);
    expect(play(engine, game, END).run!.heroes.map((h) => h.hp)).toEqual([19, 19, 19]);
  });

  it('set bonuses last one turn', () => {
    const { engine, game } = fight({ content: withSets({ heroes: party(blade(), heart(), blade()) }) });
    const g = play(engine, game, use(1, { side: 'hero', index: 0 }), END);
    expect(g.run!.fight!.dice.map((d) => d.bonus)).toEqual([0, 0, 0]);
    expect(g.run!.fight!.sets).toEqual([]);
  });

  it('undoing back to rolling removes the set so it cannot be counted twice', () => {
    const { engine, game } = fight({ content: withSets({ heroes: party(blade(), blade(), blade()) }) });
    const g = play(engine, game, use(0, foe(game)), { type: 'undo' });
    expect(g).toEqual(game);
    expect(play(engine, g, use(0, foe(g))).run!.fight!.enemies[0]!.hp).toBe(24);
  });

  it('blank and cursed faces have no symbol and join nothing', () => {
    const { engine, game } = fight({ content: withSets({ heroes: party(blade(), face('blank'), blade()) }) });
    game.run!.fight!.heroes[2]!.cursed = [0, 1, 2, 3, 4, 5];
    expect(engine.previewSets(game)).toEqual([]);
    expect(engine.dice(game)[2]).toMatchObject({ effect: 'blank', symbol: null, cursed: true, value: 0 });
  });

  it('three different symbols are nothing without a rainbow item, and a rainbow with one', () => {
    const c = withSets({ heroes: party(blade(), guard(), heart()), items: [item('rainbow_prism', { modifiers: [{ type: 'enableRainbow' }] })] });
    const plain = fight({ content: c });
    expect(plain.engine.previewSets(plain.game)).toEqual([]);
    const { engine, game } = fight({ content: c, items: [['rainbow_prism']] });
    expect(engine.previewSets(game)).toEqual([{ kind: 'rainbow', symbol: null, dice: [0, 1, 2] }]);
    expect(values(engine, game)).toEqual([3, 3, 3]);
    expect(play(engine, game, END).run!.stats.run.rainbowsFormed).toBe(1);
  });

  it('a pair beats a rainbow when both are possible', () => {
    const c = withSets({ heroes: party(blade(), blade(), heart()), items: [item('rainbow_prism', { modifiers: [{ type: 'enableRainbow' }] })] });
    const { engine, game } = fight({ content: c, items: [['rainbow_prism']] });
    expect(engine.previewSets(game)[0]!.kind).toBe('pair');
  });

  it('a wild die counts as whichever symbol makes the best set', () => {
    const c = withSets({ heroes: party(blade(), blade(), heart()), items: [item('mirror_shard', { modifiers: [{ type: 'wildSymbol' }] })] });
    const { engine, game } = fight({ content: c, items: [[], [], ['mirror_shard']] });
    expect(engine.previewSets(game)).toEqual([{ kind: 'triple', symbol: 'blade', dice: [0, 1, 2] }]);
    const two = fight({ content: withSets({ heroes: party(guard(), face('blank'), heart()), items: c.items }), items: [[], [], ['mirror_shard']] });
    expect(two.engine.previewSets(two.game)).toEqual([{ kind: 'pair', symbol: 'guard', dice: [0, 2] }]);
  });

  it('Echo keeps its own symbol for sets', () => {
    const { engine, game } = fight({ content: withSets({ heroes: party(blade(), face('damage', 1, ['echo'], 'heart'), heart()) }) });
    expect(engine.previewSets(game)).toEqual([{ kind: 'pair', symbol: 'heart', dice: [1, 2] }]);
    expect(engine.dice(game)[1]).toMatchObject({ effect: 'damage', value: 4, symbol: 'heart' });
  });

  it('setBonus items add to each die in a matching set', () => {
    const c = withSets({
      heroes: party(blade(), heart(), blade()),
      items: [item('twin_charm', { modifiers: [{ type: 'setBonus', amount: 1, kind: 'pair' }] }), item('crown_of_three', { modifiers: [{ type: 'setBonus', amount: 5, kind: 'triple' }] })],
    });
    const { engine, game } = fight({ content: c, items: [['twin_charm', 'crown_of_three']] });
    expect(values(engine, game)).toEqual([4, 2, 4]);
  });

  it('tripleBurstMultiplier multiplies the burst', () => {
    const c = withSets({ heroes: party(blade(), blade(), blade()), items: [item('crown_of_three', { modifiers: [{ type: 'tripleBurstMultiplier', factor: 3 }] })] });
    const { engine, game } = fight({ content: c, items: [['crown_of_three']] });
    expect(play(engine, game, END).run!.fight!.enemies[0]!.hp).toBe(24);
  });

  it('a symbol-specific set rule overrides the generic one', () => {
    const sets: ContentDB['sets'] = [{ kind: 'pair', name: '', text: '', dieBonus: 1 }, { kind: 'pair', symbol: 'heart', name: '', text: '', dieBonus: 4 }];
    const { engine, game } = fight({ content: content({ sets, heroes: party(heart(), heart(), blade()) }) });
    expect(values(engine, game)).toEqual([6, 6, 2]);
  });

  it('no set rules in the content means no sets', () => {
    const { engine, game } = fight({ content: content({ heroes: party(blade(), blade(), blade()) }) });
    expect(engine.previewSets(game)).toEqual([]);
  });
});
