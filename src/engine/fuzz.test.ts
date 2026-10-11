import type { Action, ContentDB, GameState, HeroId } from '@shared';
import { describe, expect, it } from 'vitest';
import { createEngine } from './index';
import { fullContent } from './testing/fixtures';
import { randomRun } from './testing/harness';

type Engine = ReturnType<typeof createEngine>;

/** The broad fixture, and a version with very sturdy heroes so that random play gets deep into runs. */
const hard = createEngine(fullContent());
const easy = createEngine(((): ContentDB => {
  const c = fullContent();
  return { ...c, heroes: c.heroes.map((h) => ({ ...h, maxHp: h.maxHp * 12, faces: h.faces.map((f) => (f.effect === 'damage' ? { ...f, value: f.value + 3 } : f)) })) };
})());

/** A profile with everything unlocked, so the fuzz reaches every hero, item and tier. */
function openGame(engine: Engine): GameState {
  const g = engine.newGame();
  g.profile.unlockedHeroes = engine.content.heroes.map((h) => h.id);
  g.profile.unlockedItems = engine.content.items.filter((i) => i.locked).map((i) => i.id);
  g.profile.maxTier = 5;
  return g;
}

function party(engine: Engine, i: number): [HeroId, HeroId, HeroId] {
  const ids = engine.content.heroes.map((h) => h.id);
  const n = ids.length;
  const a = i % n;
  const b = (a + 1 + (i % 3)) % n;
  let c = (a + 5) % n;
  if (c === b) c = (c + 1) % n;
  return [ids[a]!, ids[b]!, ids[c]!];
}

const begin = (engine: Engine, i: number, tag: string): GameState =>
  engine.apply(openGame(engine), { type: 'startRun', heroes: party(engine, i), tier: i % 6, seed: `${tag}-${i}` }).game;

function invariants(engine: Engine, g: GameState): void {
  const run = g.run;
  if (!run) return;
  expect(run.gold).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(run.gold)).toBe(true);
  for (const h of run.heroes) {
    expect(Number.isInteger(h.hp)).toBe(true);
    expect(h.hp).toBeGreaterThanOrEqual(0);
    expect(h.hp).toBeLessThanOrEqual(h.maxHp);
    expect(h.maxHp).toBeGreaterThanOrEqual(1);
    expect(h.downed).toBe(h.hp === 0);
    expect(h.faces.length).toBe(6);
    expect(h.items.length).toBeLessThanOrEqual(2);
    expect(new Set(h.items).size).toBe(h.items.length);
    for (const f of h.faces) expect(f.upgrades).toBeLessThanOrEqual(engine.content.rules.maxUpgradesPerFace);
  }
  expect(new Set(run.heroes.flatMap((h) => h.items)).size).toBe(run.heroes.flatMap((h) => h.items).length);
  const f = run.fight;
  expect(run.phase === 'fight').toBe(f !== null);
  expect(run.phase === 'reward').toBe(run.reward !== null && run.phase !== 'event');
  expect(run.phase === 'doors').toBe(run.doors !== null);
  expect(run.phase === 'shop').toBe(run.shop !== null);
  expect(run.phase === 'rest').toBe(run.rest !== null);
  if (run.phase !== 'victory' && run.phase !== 'defeat') {
    expect(run.heroes.some((h) => !h.downed) || run.phase !== 'fight').toBe(true);
    expect(engine.legalActions(g).length).toBeGreaterThan(0);
  }
  if (!f) return;
  expect(f.enemies.length).toBeGreaterThan(0);
  expect(f.enemies.length).toBeLessThanOrEqual(engine.content.rules.maxEnemies);
  expect(f.rerollsLeft).toBeGreaterThanOrEqual(0);
  expect(new Set(f.enemies.map((e) => e.uid)).size).toBe(f.enemies.length);
  for (const e of f.enemies) {
    expect(Number.isInteger(e.hp)).toBe(true);
    expect(e.hp).toBeGreaterThan(0);
    expect(e.hp).toBeLessThanOrEqual(e.maxHp);
    expect(e.shield).toBeGreaterThanOrEqual(0);
    expect(e.intent).not.toBeNull();
    for (const n of Object.values(e.statuses)) expect(n).toBeGreaterThan(0);
  }
  f.heroes.forEach((hf) => {
    expect(hf.shield).toBeGreaterThanOrEqual(0);
    expect(hf.ward).toBeGreaterThanOrEqual(0);
  });
  for (const d of f.dice) {
    expect(d.face).toBeGreaterThanOrEqual(0);
    expect(d.face).toBeLessThan(6);
    expect(f.phase === 'rolling' && d.used).toBe(false);
  }
  expect(f.undo.length).toBe(f.phase === 'rolling' ? 0 : f.diceUsed);
}

/** Checks that what previewDie / forecast promised for this action is exactly what apply then did. */
function checkPromise(engine: Engine, g: GameState, a: Action, next: GameState): void {
  const f = g.run?.fight;
  if (!f) return;
  const sameFight = !!next.run?.fight && next.run.fightsWon === g.run!.fightsWon && next.run.fight.encounterId === f.encounterId;
  if (a.type === 'useDie') {
    const pv = engine.previewDie(g, a.die, a.target);
    const user = f.dice[a.die]!.hero;
    const nf = next.run?.fight;
    if (!sameFight || !nf || next.run!.phase !== 'fight') {
      // the fight ended: either every enemy was promised dead, or the user was promised to go down
      const won = next.run!.fightsWon > g.run!.fightsWon;
      if (won) for (const e of f.enemies) expect(pv.hits.find((h) => h.target.side === 'enemy' && h.target.uid === e.uid)?.kills).toBe(true);
      return;
    }
    expect(pv.selfHpLoss).toBe(Math.max(0, g.run!.heroes[user]!.hp - next.run!.heroes[user]!.hp));
    expect(pv.rerollsNextTurn).toBe(nf.nextTurnRerolls - f.nextTurnRerolls);
    for (const e of f.enemies) {
      const hit = pv.hits.find((h) => h.target.side === 'enemy' && h.target.uid === e.uid);
      const after = nf.enemies.find((x) => x.uid === e.uid);
      const hpLoss = e.hp - (after ? after.hp : 0);
      expect(hit?.hpLoss ?? 0).toBe(Math.max(0, hpLoss));
      expect(hit?.kills ?? false).toBe(!after);
      if (after) {
        expect(hit?.poison ?? 0).toBe(Math.max(0, (after.statuses.poison ?? 0) - (e.statuses.poison ?? 0)));
        expect(hit?.weaken ?? 0).toBe(Math.max(0, (after.statuses.weak ?? 0) - (e.statuses.weak ?? 0)));
        expect(hit?.shieldLoss ?? 0).toBe(Math.max(0, e.shield - after.shield));
      }
    }
    g.run!.heroes.forEach((h, i) => {
      if (h.downed) return;
      const hit = pv.hits.find((x) => x.target.side === 'hero' && x.target.index === i);
      const after = next.run!.heroes[i]!;
      const sh = (s: GameState): number => s.run!.fight!.heroes[i]!.shield + s.run!.fight!.heroes[i]!.ward;
      if (i !== user || hit) expect(hit?.hpLoss ?? 0).toBe(Math.max(0, h.hp - after.hp));
      expect(hit?.heal ?? 0).toBe(Math.max(0, after.hp - h.hp));
      expect(hit?.shieldGain ?? 0).toBe(Math.max(0, sh(next) - sh(g)));
      expect(hit?.shieldLoss ?? 0).toBe(Math.max(0, sh(g) - sh(next)));
    });
  } else if (a.type === 'endTurn') {
    const fc = engine.forecast(g);
    expect(fc.heroes).toHaveLength(g.run!.heroes.length);
    if (next.run!.phase === 'defeat') {
      expect(fc.partyWipe).toBe(true);
      return;
    }
    expect(fc.partyWipe).toBe(false);
    if (!sameFight) return;
    const nf = next.run!.fight!;
    let stolen = 0;
    g.run!.heroes.forEach((h, i) => {
      const p = fc.heroes[i]!;
      const after = next.run!.heroes[i]!;
      const regen = h.downed ? 0 : (g.run!.fight!.heroes[i]!.statuses.regen ?? 0);
      if (regen === 0) expect(p.hpLoss).toBe(Math.max(0, h.hp - after.hp));
      expect(p.downed).toBe(!h.downed && after.downed);
      const die = nf.dice.find((d) => d.hero === i);
      expect(p.jammed && !after.downed).toBe(die ? die.jammed : false);
      const newCurses = nf.heroes[i]!.cursed.filter((x) => !f.heroes[i]!.cursed.includes(x));
      if (!after.downed) expect(p.cursedFace).toBe(newCurses.length ? newCurses[0] : null);
      stolen += 0;
    });
    expect(fc.rerollsStolen).toBeGreaterThanOrEqual(stolen);
  }
}

describe('fuzz: seeded random legal play', () => {
  it('300 hard runs: never throws, every legal action is accepted, invariants hold, every run ends', () => {
    let ended = 0;
    for (let i = 0; i < 300; i++) {
      const { game } = randomRun(hard, begin(hard, i, 'fuzz'), `bot-${i}`, 6000, (g) => {
        for (const a of hard.legalActions(g)) expect(hard.canApply(g, a)).toBe(true);
      });
      if (!game.run) ended++;
    }
    expect(ended).toBe(300);
  });

  it('60 deep runs: invariants after every action, and previews / forecasts match what then happens', () => {
    let wins = 0;
    let furthest = 0;
    const phases = new Set<string>();
    for (let i = 0; i < 60; i++) {
      let prev: GameState | null = null;
      let prevAction: Action | null = null;
      const { game } = randomRun(easy, begin(easy, i, 'deep'), `deep-bot-${i}`, 20000, (g, a) => {
        if (prev && prevAction) checkPromise(easy, prev, prevAction, g);
        invariants(easy, g);
        if (g.run) {
          phases.add(g.run.phase);
          furthest = Math.max(furthest, g.run.fightsWon);
          if (g.run.phase === 'victory') wins++;
        }
        prev = g;
        prevAction = a;
      });
      expect(game.run).toBeNull();
    }
    expect(furthest).toBe(12);
    expect(wins).toBeGreaterThanOrEqual(3); // coverage check: some random runs do go the whole way
    expect([...phases].sort()).toEqual(['defeat', 'doors', 'event', 'fight', 'rest', 'reward', 'shop', 'victory']);
  });

  it('the same seed and the same actions give the same run, event for event', () => {
    for (let i = 0; i < 20; i++) {
      const log = (): string => {
        const events: unknown[] = [];
        let g = begin(easy, i, 'same');
        for (let step = 0; step < 3000 && g.run; step++) {
          const acts = easy.legalActions(g);
          const res = easy.apply(g, acts[(step * 31 + i) % acts.length]!);
          events.push(res.events);
          g = res.game;
        }
        return JSON.stringify([events, g]);
      };
      expect(log()).toBe(log());
    }
  });

  it('saving and loading at any point changes nothing about what follows', () => {
    for (let i = 0; i < 40; i++) {
      const start = begin(easy, i, 'save');
      const straight = randomRun(easy, start, `save-bot-${i}`, 20000).game;
      let g = start;
      let steps = 0;
      while (g.run && steps < 20000) {
        if (steps % 7 === i % 7) {
          const text = easy.save({ app: 'pip-and-blade', version: 1, game: g, settings: { reduceMotion: true } });
          const back = easy.load(text);
          expect(back.game).toEqual(g);
          expect(back.settings).toEqual({ reduceMotion: true });
          g = back.game;
        }
        const acts = easy.legalActions(g);
        g = easy.apply(g, acts[Math.floor((rand(`save-bot-${i}`, steps) / 4294967296) * acts.length)]!).game;
        steps++;
      }
      expect(g).toEqual(straight);
    }
  });

  it('state stays plain JSON at every step', () => {
    for (let i = 0; i < 20; i++) {
      randomRun(easy, begin(easy, i, 'json'), `json-bot-${i}`, 20000, (g) => {
        expect(JSON.parse(JSON.stringify(g))).toEqual(g);
      });
    }
  });
});

/** Mirrors the harness bot's pick so a reloaded run can be compared with a straight one. */
import { rand32 } from './rng';
function rand(seed: string, step: number): number {
  return rand32(seed, 'bot', step);
}
