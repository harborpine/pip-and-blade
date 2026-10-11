import type { SaveFile } from '@shared';
import { SAVE_VERSION, SaveError } from '@shared';
import { describe, expect, it } from 'vitest';
import { buildDb } from './db';
import { createEngine } from './index';
import { load } from './save/index';
import type { Migration } from './save/migrations';
import { MIGRATIONS, runMigrations } from './save/migrations';
import { fullContent } from './testing/fixtures';
import { forceWin, play, toNextFight } from './testing/harness';

const engine = createEngine(fullContent());
const midRun = (): SaveFile => {
  let g = engine.apply(engine.newGame(), { type: 'startRun', heroes: ['bulwark', 'duelist', 'herbalist'], tier: 0, seed: 'save' }).game;
  g = toNextFight(engine, forceWin(engine, g));
  g = play(engine, g, { type: 'toggleLock', die: 0 }, { type: 'reroll' });
  return { app: 'pip-and-blade', version: SAVE_VERSION, game: g, settings: { reduceMotion: true } };
};

describe('save and load', () => {
  it('a new save is an empty profile at the current version', () => {
    expect(engine.newSave()).toEqual({ app: 'pip-and-blade', version: SAVE_VERSION, game: engine.newGame(), settings: { reduceMotion: false } });
    expect(engine.load(engine.save(engine.newSave()))).toEqual(engine.newSave());
  });

  it('a mid-fight save comes back exactly and play continues identically', () => {
    const file = midRun();
    const text = engine.save(file);
    expect(typeof text).toBe('string');
    const back = engine.load(text);
    expect(back).toEqual(file);
    const a = engine.apply(file.game, { type: 'reroll' });
    const b = engine.apply(back.game, { type: 'reroll' });
    expect(b).toEqual(a);
  });

  it('rejects anything that is not a usable save with a SaveError', () => {
    const good = midRun();
    const broken: unknown[] = [
      'not json', '', 'null', '[]', '42', '{}',
      { ...good, app: 'something-else' },
      { ...good, version: SAVE_VERSION + 1 },
      { ...good, version: 0 },
      { ...good, version: '1' },
      { ...good, game: null },
      { ...good, game: { run: null } },
      { ...good, game: { profile: { ...good.game.profile, unlockedHeroes: 'all' }, run: null } },
      { ...good, game: { profile: { ...good.game.profile, stats: { ...good.game.profile.stats, runsWon: 'many' } }, run: null } },
      { ...good, game: { profile: { ...good.game.profile, daily: { x: { attempts: 'x' } } }, run: null } },
      { ...good, game: { ...good.game, run: { ...good.game.run, heroes: [] } } },
      { ...good, game: { ...good.game, run: { ...good.game.run, phase: 'lunch' } } },
      { ...good, game: { ...good.game, run: { ...good.game.run, fight: null } } },
      { ...good, game: { ...good.game, run: { ...good.game.run, rng: { a: 'b' } } } },
      { ...good, game: { ...good.game, run: { ...good.game.run, fight: { ...good.game.run!.fight, dice: [{ hero: 9 }] } } } },
      { ...good, game: { ...good.game, run: { ...good.game.run, heroes: good.game.run!.heroes.map((h) => ({ ...h, hp: 999 })) } } },
      { ...good, game: { ...good.game, run: 'yes' } },
    ];
    for (const b of broken) {
      const text = typeof b === 'string' ? b : JSON.stringify(b);
      expect(() => engine.load(text), text.slice(0, 60)).toThrow(SaveError);
    }
  });

  it('keeps progress but drops a run that refers to content that no longer exists', () => {
    const file = midRun();
    file.game.profile.featsDone = ['ft.first', 'ft.first'];
    const text = engine.save(file).replace(/"heroId":"duelist"/, '"heroId":"retired_hero"');
    const back = engine.load(text);
    expect(back.game.run).toBeNull();
    expect(back.game.profile.stats.runsPlayed).toBe(1);
    expect(back.game.profile.featsDone).toEqual(['ft.first']);
  });

  it('cleans unknown ids out of the profile, keeps the starters and clamps the tier', () => {
    const file = engine.newSave();
    const raw = JSON.parse(engine.save(file)) as { game: { profile: Record<string, unknown> } };
    raw.game.profile.unlockedHeroes = ['gambler', 'nobody', 'gambler'];
    raw.game.profile.unlockedItems = ['void_pip', 'old_item'];
    raw.game.profile.seen = { heroes: ['bulwark', 'x'], items: ['y'], enemies: ['gnaw_rat', 'z'] };
    raw.game.profile.maxTier = 99;
    const p = engine.load(JSON.stringify(raw)).game.profile;
    expect(p.unlockedHeroes).toEqual(['bulwark', 'duelist', 'herbalist', 'gambler']);
    expect(p.unlockedItems).toEqual(['void_pip']);
    expect(p.seen).toEqual({ heroes: ['bulwark'], items: [], enemies: ['gnaw_rat'] });
    expect(p.maxTier).toBe(5);
  });

  it('settings default safely', () => {
    const raw = { ...engine.newSave(), settings: undefined };
    expect(engine.load(JSON.stringify(raw)).settings).toEqual({ reduceMotion: false });
  });
});

describe('migrations', () => {
  const list: Migration[] = [
    { from: 1, to: 2, migrate: (raw) => ({ ...raw, renamed: raw.old, old: undefined }) },
    { from: 2, to: 3, migrate: (raw) => ({ ...raw, count: (raw.count as number) + 1 }) },
  ];

  it('version 1 is the first format, so the shipped list is empty', () => {
    expect(MIGRATIONS).toEqual([]);
    expect(SAVE_VERSION).toBe(1);
  });

  it('runs every step in order from the save\'s version to the current one', () => {
    expect(runMigrations({ version: 1, old: 'x', count: 0 }, 3, list)).toEqual({ version: 3, renamed: 'x', old: undefined, count: 1 });
    expect(runMigrations({ version: 2, count: 5 }, 3, list)).toEqual({ version: 3, count: 6 });
    expect(runMigrations({ version: 3, count: 5 }, 3, list)).toEqual({ version: 3, count: 5 });
  });

  it('fails clearly on a gap, a newer save or a missing version', () => {
    expect(() => runMigrations({ version: 1 }, 3, [list[1]!])).toThrow(/no migration/);
    expect(() => runMigrations({ version: 4 }, 3, list)).toThrow(/newer/);
    expect(() => runMigrations({}, 3, list)).toThrow(/version/);
  });

  it('load applies migrations before validating', () => {
    const db = buildDb(fullContent());
    const old = { app: 'pip-and-blade', version: 1, game: { profile: engine.newProfile(), run: null }, settings: { reduceMotion: true }, note: 'v1' };
    // pretend the list upgrades v1 saves in place (same target version cannot be tested until SAVE_VERSION moves on)
    expect(load(db, JSON.stringify(old), list).game.profile).toEqual(engine.newProfile());
    const wrapped = () => load(db, JSON.stringify({ ...old, version: 7 }), list);
    expect(wrapped).toThrow(SaveError);
  });
});
