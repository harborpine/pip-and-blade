import type { ContentDB, FeatDef, GameState, HeroId, StatTest } from '@shared';
import { describe, expect, it } from 'vitest';
import { createEngine } from './index';
import { content, enemy, face, fullContent, hero, item } from './testing/fixtures';
import { ally, END, fight, foe, forceRun, forceWin, play, toNextFight, use } from './testing/harness';

type Engine = ReturnType<typeof createEngine>;
const PARTY: [HeroId, HeroId, HeroId] = ['bulwark', 'duelist', 'herbalist'];
const strong = (): ContentDB['heroes'] => [hero('bulwark', face('damage', 5)), hero('duelist', face('damage', 5)), hero('herbalist', face('damage', 5)), hero('gambler', face('damage', 5), 20, false), hero('redhand', face('damage', 5), 20, false)];
const feat = (id: string, when: FeatDef['when'], tests: StatTest[], more: Partial<FeatDef> = {}): FeatDef => ({ id, name: id, text: '', when, tests, ...more });
const onward: ContentDB['doors'] = [{ kind: 'onward', name: '', text: '', weight: [1, 1, 1] }];

function start(over: Partial<ContentDB> = {}, tier = 0, from?: GameState): { engine: Engine; game: GameState } {
  const engine = createEngine({ ...fullContent(), heroes: strong(), doors: onward, ...over });
  return { engine, game: engine.apply(from ?? engine.newGame(), { type: 'startRun', heroes: PARTY, tier, seed: 'meta' }).game };
}

describe('profile', () => {
  it('a new profile has only the starter heroes and nothing else', () => {
    const engine = createEngine(fullContent());
    expect(engine.newProfile()).toEqual({
      unlockedHeroes: ['bulwark', 'duelist', 'herbalist'], unlockedItems: [], featsDone: [], maxTier: 0, tutorialDone: false,
      seen: { heroes: [], items: [], enemies: [] },
      stats: { runsPlayed: 0, runsWon: 0, winStreak: 0, bestStreak: 0, tierWon: -1, dailyWins: 0, perHero: {}, lifetime: {} },
      daily: {},
    });
    expect(engine.newGame()).toEqual({ profile: engine.newProfile(), run: null });
  });

  it('startRun needs three different unlocked heroes and an unlocked tier', () => {
    const engine = createEngine(fullContent());
    const g = engine.newGame();
    const bad: [HeroId, HeroId, HeroId][] = [['bulwark', 'bulwark', 'duelist'], ['bulwark', 'duelist', 'gambler']];
    for (const heroes of bad) expect(engine.canApply(g, { type: 'startRun', heroes, tier: 0 })).toBe(false);
    expect(engine.canApply(g, { type: 'startRun', heroes: PARTY, tier: 1 })).toBe(false);
    expect(engine.canApply(g, { type: 'startRun', heroes: ['bulwark', 'duelist'] as unknown as [HeroId, HeroId, HeroId], tier: 0 })).toBe(false);
    expect(engine.legalActions(g)).toEqual([{ type: 'startRun', heroes: PARTY, tier: 0 }, { type: 'startTutorial' }]);
    const running = engine.apply(g, { type: 'startRun', heroes: PARTY, tier: 0, seed: 's' }).game;
    expect(engine.canApply(running, { type: 'startRun', heroes: PARTY, tier: 0 })).toBe(false);
    expect(engine.canApply(running, { type: 'startTutorial' })).toBe(false);
  });

  it('starting a run records it, the heroes used and the enemies met', () => {
    const { game } = start();
    expect(game.profile.stats).toMatchObject({ runsPlayed: 1, runsWon: 0 });
    expect(game.profile.stats.perHero).toEqual({ bulwark: { runs: 1, wins: 0 }, duelist: { runs: 1, wins: 0 }, herbalist: { runs: 1, wins: 0 } });
    expect(game.profile.seen.heroes).toEqual(PARTY);
    expect(game.profile.seen.enemies.length).toBeGreaterThan(0);
    expect(game.profile.seen.enemies).toEqual([...new Set(game.run!.fight!.enemies.map((e) => e.enemyId))]);
  });

  it('winning raises wins, streaks, per-hero wins and unlocks the next tier (up to the last one)', () => {
    const { engine, game } = start();
    const res = forceRun(engine, game);
    expect(res.run!.phase).toBe('victory');
    expect(res.profile.stats).toMatchObject({ runsPlayed: 1, runsWon: 1, winStreak: 1, bestStreak: 1, tierWon: 0 });
    expect(res.profile.stats.perHero.duelist).toEqual({ runs: 1, wins: 1 });
    expect(res.profile.maxTier).toBe(1);
    let g = play(engine, res, { type: 'continue' });
    expect(engine.canApply(g, { type: 'startRun', heroes: PARTY, tier: 1 })).toBe(true);
    expect(engine.canApply(g, { type: 'startRun', heroes: PARTY, tier: 2 })).toBe(false);
    g = forceRun(engine, engine.apply(g, { type: 'startRun', heroes: PARTY, tier: 1, seed: 't1' }).game);
    expect(g.profile).toMatchObject({ maxTier: 2, stats: { tierWon: 1, winStreak: 2, bestStreak: 2 } });
    g.profile.maxTier = 5;
    g = forceRun(engine, engine.apply(play(engine, g, { type: 'continue' }), { type: 'startRun', heroes: PARTY, tier: 5, seed: 't5' }).game);
    expect(g.profile).toMatchObject({ maxTier: 5, stats: { tierWon: 5 } });
    expect(g.profile.stats.lifetime.fightsWon).toBe(36);
  });

  it('losing or abandoning ends the streak; abandon clears the run at once', () => {
    const { engine, game } = start();
    let g = play(engine, forceRun(engine, game), { type: 'continue' });
    g = engine.apply(g, { type: 'startRun', heroes: PARTY, tier: 0, seed: 'x' }).game;
    const res = engine.apply(g, { type: 'abandonRun' });
    expect(res.game.run).toBeNull();
    expect(res.events).toContainEqual({ type: 'runEnded', won: false, score: 0 });
    expect(res.game.profile.stats).toMatchObject({ runsPlayed: 2, runsWon: 1, winStreak: 0, bestStreak: 1 });
    expect(engine.canApply(res.game, { type: 'abandonRun' })).toBe(false);
  });
});

describe('stat counters', () => {
  it('count at turn, fight and run scope and reset at the right moments', () => {
    const c = content({ enemies: [enemy('gnaw_rat', 30, [{ type: 'attack', amount: 3, target: 'front' }]), enemy('mud_slime', 2)], doors: onward });
    const { engine, game } = fight({ content: c, enemies: ['gnaw_rat', 'mud_slime'] });
    let g = play(engine, game, { type: 'reroll' }, use(0, ally(0)), use(1, foe(game, 1)), use(2, ally(0)));
    expect(g.run!.stats.turn).toEqual({ turnsTaken: 1, rerollsSpent: 1, dicePlayed: 3, shieldGained: 2, damageDealt: 2, biggestHit: 3, enemiesKilled: 1 });
    g = play(engine, g, END, use(1, foe(g, 0)));
    expect(g.run!.stats.turn).toEqual({ turnsTaken: 1, dicePlayed: 1, damageDealt: 3, biggestHit: 3 });
    expect(g.run!.stats.fight).toMatchObject({ turnsTaken: 2, dicePlayed: 4, damageDealt: 5, hpLost: 1, rerollsSpent: 1 });
    g.run!.fight!.enemies[0]!.hp = 1;
    g = toNextFight(engine, play(engine, g, END, use(1, foe(g))));
    expect(g.run!.stats.fight).toEqual({ turnsTaken: 1 });
    expect(g.run!.stats.run).toMatchObject({ turnsTaken: 4, fightsWon: 1, goldEarned: 10, enemiesKilled: 2, rerollsSpent: 1 });
  });

  it('healingDone, heroesDowned, recklessUses, echoUses and biggestHit', () => {
    const c = content({
      heroes: [hero('bulwark', face('damage', 9, ['reckless'])), hero('duelist', face('damage', 1, ['echo'])), hero('herbalist', face('heal', 5))],
      enemies: [enemy('gnaw_rat', 40, [{ type: 'attack', amount: 30, target: 'back' }], { startShield: 4 })],
    });
    const { engine, game } = fight({ content: c, hp: [20, 20, 18] });
    const g = play(engine, game, use(0, foe(game)), use(1, foe(game)), use(2, ally(2)), END);
    expect(g.run!.stats.run).toMatchObject({ recklessUses: 2, echoUses: 1, healingDone: 2, heroesDowned: 1, biggestHit: 10, damageDealt: 5 + 10, hpLost: 2 + 2 + 20 });
  });
});

describe('feats', () => {
  it('are checked at their moment, unlock heroes and items, and are earned only once', () => {
    const feats = [
      feat('turn', 'turnEnd', [{ stat: 'damageDealt', scope: 'turn', op: '>=', value: 10 }], { unlocks: { heroes: ['gambler'] } }),
      feat('fight', 'fightWon', [{ stat: 'rerollsSpent', scope: 'fight', op: '==', value: 0 }], { unlocks: { items: ['void_pip', 'echo_bell'] } }),
      feat('never', 'fightWon', [{ stat: 'rerollsSpent', scope: 'fight', op: '>=', value: 1 }]),
    ];
    const { engine, game } = start({ feats, sets: [] });
    let g = play(engine, game, use(0, foe(game, 0)));
    expect(g.profile.featsDone).toEqual([]);
    const res = engine.apply(play(engine, g, use(1, foe(g, 1))), END);
    expect(res.events).toContainEqual({ type: 'featDone', feat: 'turn' });
    expect(res.events).toContainEqual({ type: 'unlocked', kind: 'hero', id: 'gambler' });
    expect(res.game.profile.unlockedHeroes).toEqual(['bulwark', 'duelist', 'herbalist', 'gambler']);
    expect(res.game.run!.featsEarned).toEqual(['turn']);
    g = forceWin(engine, res.game);
    expect(g.profile.featsDone).toEqual(['turn', 'fight']);
    expect(g.profile.unlockedItems).toEqual(['void_pip', 'echo_bell']);
    g = forceWin(engine, toNextFight(engine, g));
    expect(g.profile.featsDone).toEqual(['turn', 'fight']);
    expect(g.run!.featsEarned).toEqual(['turn', 'fight']);
  });

  it('turnEnd feats also count for the turn that wins the fight', () => {
    const { engine, game } = start({ feats: [feat('kill', 'turnEnd', [{ stat: 'enemiesKilled', scope: 'turn', op: '>=', value: 1 }])] });
    expect(forceWin(engine, game).profile.featsDone).toEqual(['kill']);
  });

  it('bossWon, runWon and runEnded moments; lifetime scope includes the current run', () => {
    const feats = [
      feat('boss', 'bossWon', [{ stat: 'bossesWon', scope: 'run', op: '>=', value: 2 }]),
      feat('won', 'runWon', [{ stat: 'runsWon', scope: 'lifetime', op: '>=', value: 1 }, { stat: 'tierWon', scope: 'lifetime', op: '>=', value: 0 }, { stat: 'winStreak', scope: 'lifetime', op: '==', value: 1 }]),
      feat('ended', 'runEnded', [{ stat: 'runsPlayed', scope: 'lifetime', op: '>=', value: 1 }]),
      feat('life', 'fightWon', [{ stat: 'fightsWon', scope: 'lifetime', op: '>=', value: 14 }]),
    ];
    const { engine, game } = start({ feats });
    let g = forceRun(engine, game);
    expect(g.profile.featsDone).toEqual(['boss', 'won', 'ended']);
    expect(g.profile.stats.lifetime.fightsWon).toBe(12);
    g = engine.apply(play(engine, g, { type: 'continue' }), { type: 'startRun', heroes: PARTY, tier: 0, seed: 'again' }).game;
    g = forceWin(engine, g);
    expect(g.profile.featsDone).not.toContain('life');
    g = forceWin(engine, toNextFight(engine, g));
    expect(g.profile.featsDone).toContain('life');
    const lost = start({ feats });
    expect(play(lost.engine, lost.game, { type: 'abandonRun' }).profile.featsDone).toEqual(['ended']);
  });

  it('snapshot stats are read at check time', () => {
    const feats = [
      feat('alive', 'fightWon', [{ stat: 'livingHeroes', scope: 'run', op: '==', value: 2 }, { stat: 'lowestLivingHeroHp', scope: 'run', op: '<=', value: 1 }]),
      feat('kit', 'fightWon', [{ stat: 'itemsHeld', scope: 'run', op: '>=', value: 2 }, { stat: 'blankFacesOwned', scope: 'run', op: '==', value: 1 }]),
    ];
    const { engine, game } = start({ feats, items: [item('field_medic_kit', { modifiers: [{ type: 'healAfterFight', amount: 5 }] }), item('whetstone')] });
    game.run!.heroes[0]!.hp = 1;
    game.run!.heroes[2]!.hp = 0;
    game.run!.heroes[2]!.downed = true;
    game.run!.heroes[0]!.items = ['field_medic_kit', 'whetstone'];
    game.run!.heroes[1]!.faces = game.run!.heroes[1]!.faces.map((f, i) => (i === 5 ? { ...f, effect: 'blank' as const, symbol: null, value: 0 } : f));
    game.run!.fight!.dice = game.run!.fight!.dice.filter((d) => d.hero !== 2);
    const g = forceWin(engine, { ...game, run: { ...game.run!, fight: { ...game.run!.fight!, dice: game.run!.fight!.dice.map((d) => ({ ...d, face: 0 })) } } });
    expect(g.profile.featsDone).toEqual(['alive', 'kit']);
    expect(g.run!.heroes[0]!.hp).toBe(6); // the feat saw 1 HP: it is checked before the after-fight heal
  });

  it('respect required heroes, minimum tier and mode', () => {
    const t: StatTest[] = [{ stat: 'fightsWon', scope: 'run', op: '>=', value: 1 }];
    const feats = [
      feat('with', 'fightWon', t, { heroes: ['bulwark', 'duelist'] }),
      feat('without', 'fightWon', t, { heroes: ['gambler'] }),
      feat('tier', 'fightWon', t, { minTier: 2 }),
      feat('daily', 'fightWon', t, { mode: 'daily' }),
      feat('standard', 'fightWon', t, { mode: 'standard' }),
    ];
    const a = start({ feats });
    expect(forceWin(a.engine, a.game).profile.featsDone).toEqual(['with', 'standard']);
    const g0 = a.engine.newGame();
    g0.profile.maxTier = 5;
    const b = start({ feats }, 2, g0);
    expect(forceWin(b.engine, b.game).profile.featsDone).toEqual(['with', 'tier', 'standard']);
    const d = forceWin(a.engine, a.engine.apply(a.engine.newGame(), { type: 'startDaily', dateKey: '2026-10-10' }).game);
    expect(d.profile.featsDone).toContain('daily');
    expect(d.profile.featsDone).not.toContain('standard');
  });

  it('newly unlocked items join the reward pool; locked ones stay out', () => {
    const items = [item('void_pip', { locked: true })];
    const a = start({ items, feats: [] });
    expect(forceWin(a.engine, a.game).run!.reward!.options.some((o) => o.type === 'item')).toBe(false);
    const g0 = a.engine.newGame();
    g0.profile.unlockedItems = ['void_pip'];
    const b = start({ items, feats: [] }, 0, g0);
    expect(forceWin(b.engine, b.game).run!.reward!.options).toContainEqual({ type: 'item', item: 'void_pip', rarity: 'common' });
  });
});

describe('daily run', () => {
  const engine = createEngine({ ...fullContent(), doors: onward });

  it('seed and party depend only on the date, and use every hero whatever is unlocked', () => {
    expect(engine.dailySeed('2026-10-10')).toBe(engine.dailySeed('2026-10-10'));
    expect(engine.dailySeed('2026-10-10')).not.toBe(engine.dailySeed('2026-10-11'));
    const used = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const key = `2026-11-${String(d).padStart(2, '0')}`;
      const party = engine.dailyHeroes(key);
      expect(party).toEqual(engine.dailyHeroes(key));
      expect(new Set(party).size).toBe(3);
      party.forEach((h) => used.add(h));
    }
    expect(used.size).toBe(8);
  });

  it('is identical on every retry and for every profile; attempts and best score are kept', () => {
    const fresh = engine.newGame();
    const veteran = engine.newGame();
    veteran.profile.unlockedHeroes = engine.content.heroes.map((h) => h.id);
    veteran.profile.maxTier = 5;
    const a = engine.apply(fresh, { type: 'startDaily', dateKey: '2026-10-10' }).game;
    const b = engine.apply(veteran, { type: 'startDaily', dateKey: '2026-10-10' }).game;
    expect(a.run).toEqual(b.run);
    expect(a.run).toMatchObject({ mode: 'daily', dateKey: '2026-10-10', tier: 0, seed: engine.dailySeed('2026-10-10') });
    expect(a.run!.heroes.map((h) => h.heroId)).toEqual(engine.dailyHeroes('2026-10-10'));
    expect(a.profile.daily).toEqual({ '2026-10-10': { attempts: 1, bestScore: 0, won: false } });
    expect(a.profile.stats.runsPlayed).toBe(0);
    let g = forceWin(engine, a);
    expect(g.run!.score).toBe(100);
    const firstReward = g.run!.reward;
    g = play(engine, g, { type: 'abandonRun' });
    expect(g.profile.daily['2026-10-10']).toEqual({ attempts: 1, bestScore: 100, won: false });
    const retry = engine.apply(g, { type: 'startDaily', dateKey: '2026-10-10' }).game;
    expect(retry.run).toEqual(a.run);
    expect(retry.profile.daily['2026-10-10']!.attempts).toBe(2);
    expect(forceWin(engine, retry).run!.reward).toEqual(firstReward);
    expect(engine.canApply(engine.newGame(), { type: 'startDaily', dateKey: 'today' })).toBe(false);
  });

  it('a daily win scores fights, bosses, the win bonus and HP left, and counts once per day', () => {
    let g = forceRun(engine, engine.apply(engine.newGame(), { type: 'startDaily', dateKey: '2026-12-01' }).game);
    expect(g.run!.phase).toBe('victory');
    const hp = g.run!.heroes.reduce((n, h) => n + (h.downed ? 0 : h.hp), 0);
    expect(g.run!.score).toBe(12 * 100 + 3 * 250 + 1000 + hp * 5);
    expect(g.profile.daily['2026-12-01']).toEqual({ attempts: 1, bestScore: g.run!.score, won: true });
    expect(g.profile.stats).toMatchObject({ dailyWins: 1, runsWon: 0, runsPlayed: 0, winStreak: 0 });
    expect(g.profile.maxTier).toBe(0);
    g = forceRun(engine, engine.apply(play(engine, g, { type: 'continue' }), { type: 'startDaily', dateKey: '2026-12-01' }).game);
    expect(g.profile.stats.dailyWins).toBe(1);
    expect(g.profile.daily['2026-12-01']!.attempts).toBe(2);
  });

  it('offers locked items too', () => {
    const only = createEngine({ ...fullContent(), items: [item('void_pip', { locked: true })] });
    const g = forceWin(only, only.apply(only.newGame(), { type: 'startDaily', dateKey: '2026-10-10' }).game);
    expect(g.run!.reward!.options).toContainEqual({ type: 'item', item: 'void_pip', rarity: 'common' });
  });
});

describe('tutorial', () => {
  const engine = createEngine({ ...fullContent(), heroes: strong(), feats: [feat('any', 'fightWon', [{ stat: 'fightsWon', scope: 'run', op: '>=', value: 0 }])] });

  it('is one fixed fight that ends in victory and counts for nothing but tutorialDone', () => {
    const a = engine.apply(engine.newGame(), { type: 'startTutorial' }).game;
    expect(a).toEqual(engine.apply(engine.newGame(), { type: 'startTutorial' }).game);
    expect(a.run).toMatchObject({ mode: 'tutorial', seed: 'tutorial', tier: 0 });
    expect(a.run!.fight!.encounterId).toBe('tutorial');
    expect(a.profile).toEqual(engine.newProfile());
    const g = forceWin(engine, a);
    expect(g.run).toMatchObject({ phase: 'victory', fight: null, reward: null });
    expect(g.profile).toEqual({ ...engine.newProfile(), tutorialDone: true });
    expect(play(engine, g, { type: 'continue' }).run).toBeNull();
  });

  it('can be skipped, which also marks it done; and replayed', () => {
    const g = play(engine, engine.apply(engine.newGame(), { type: 'startTutorial' }).game, { type: 'abandonRun' });
    expect(g).toEqual({ profile: { ...engine.newProfile(), tutorialDone: true }, run: null });
    expect(engine.canApply(g, { type: 'startTutorial' })).toBe(true);
  });
});
