/** Meta progress: profile, feats, unlocks, run records, daily score. */
import type { FeatDef, HeroId, Profile, RunState, StatCounters, StatKey, StatTest } from '@shared';
import type { Ctx } from './ctx';
import { profile } from './ctx';
import type { Db } from './db';
import { rand32 } from './rng';

export function newProfile(db: Db): Profile {
  return {
    unlockedHeroes: db.content.heroes.filter((h) => h.starter).map((h) => h.id),
    unlockedItems: [],
    featsDone: [],
    maxTier: 0,
    tutorialDone: false,
    seen: { heroes: [], items: [], enemies: [] },
    stats: { runsPlayed: 0, runsWon: 0, winStreak: 0, bestStreak: 0, tierWon: -1, dailyWins: 0, perHero: {}, lifetime: {} },
    daily: {},
  };
}

/** Stats that keep a maximum instead of a sum. */
const MAX_STATS: StatKey[] = ['biggestHit'];

function statValue(c: Ctx, t: StatTest): number {
  const run = c.run;
  const p = c.game.profile;
  switch (t.stat) {
    case 'livingHeroes': return run.heroes.filter((h) => !h.downed).length;
    case 'lowestLivingHeroHp': {
      let low = 0;
      let any = false;
      for (const h of run.heroes) if (!h.downed && (!any || h.hp < low)) { low = h.hp; any = true; }
      return low;
    }
    case 'itemsHeld': return run.heroes.reduce((n, h) => n + h.items.length, 0);
    case 'blankFacesOwned': return run.heroes.reduce((n, h) => n + h.faces.filter((f) => f.effect === 'blank').length, 0);
    case 'runsWon': return p.stats.runsWon;
    case 'runsPlayed': return p.stats.runsPlayed;
    case 'winStreak': return p.stats.winStreak;
    case 'dailyWins': return p.stats.dailyWins;
    case 'tierWon': return p.stats.tierWon;
    default: break;
  }
  if (t.scope === 'lifetime') {
    const a = p.stats.lifetime[t.stat] ?? 0;
    const b = run.stats.run[t.stat] ?? 0;
    return MAX_STATS.includes(t.stat) ? Math.max(a, b) : a + b;
  }
  return run.stats[t.scope][t.stat] ?? 0;
}

function test(c: Ctx, t: StatTest): boolean {
  const v = statValue(c, t);
  return t.op === '>=' ? v >= t.value : t.op === '<=' ? v <= t.value : v === t.value;
}

function featApplies(run: RunState, f: FeatDef): boolean {
  if (f.mode && f.mode !== run.mode) return false;
  if (f.minTier !== undefined && run.tier < f.minTier) return false;
  if (f.heroes) for (const id of f.heroes) if (!run.heroes.some((h) => h.heroId === id)) return false;
  return true;
}

/** Evaluates every not-yet-done feat with this `when`, and applies unlocks. */
export function checkFeats(c: Ctx, when: FeatDef['when']): void {
  const run = c.run;
  if (run.mode === 'tutorial' || c.preview) return;
  const feats = c.db.feats[when];
  for (const f of feats) {
    if (c.game.profile.featsDone.includes(f.id) || !featApplies(run, f)) continue;
    if (!f.tests.every((t) => test(c, t))) continue;
    const p = profile(c);
    p.featsDone.push(f.id);
    run.featsEarned.push(f.id);
    c.ev.push({ type: 'featDone', feat: f.id });
    for (const id of f.unlocks?.heroes ?? []) {
      if (!p.unlockedHeroes.includes(id)) {
        p.unlockedHeroes.push(id);
        c.ev.push({ type: 'unlocked', kind: 'hero', id });
      }
    }
    for (const id of f.unlocks?.items ?? []) {
      if (!p.unlockedItems.includes(id)) {
        p.unlockedItems.push(id);
        c.ev.push({ type: 'unlocked', kind: 'item', id });
      }
    }
  }
}

export function dailySeed(dateKey: string): string {
  return `daily-${dateKey}`;
}

/** The fixed party of a daily run: a seeded pick from every hero, unlocked or not. */
export function dailyHeroes(db: Db, dateKey: string): HeroId[] {
  const seed = dailySeed(dateKey);
  const ids = db.content.heroes.map((h) => h.id);
  const keyed = ids.map((id, i) => ({ id, k: rand32(seed, 'party', i) }));
  keyed.sort((a, b) => a.k - b.k || (a.id < b.id ? -1 : 1));
  return keyed.slice(0, db.rules.partySize).map((x) => x.id);
}

export function computeScore(c: Ctx, won: boolean): number {
  const run = c.run;
  if (run.mode !== 'daily') return 0;
  const w = c.db.rules.dailyScore;
  let s = run.fightsWon * w.perFightWon + (run.stats.run.bossesWon ?? 0) * w.perBossWon;
  if (won) {
    s += w.winBonus;
    for (const h of run.heroes) if (!h.downed) s += h.hp * w.perHpLeft;
  }
  return s;
}

/** Profile bookkeeping when a run begins. */
export function recordRunStart(c: Ctx): void {
  const run = c.run;
  if (run.mode === 'tutorial') return;
  const p = profile(c);
  for (const h of run.heroes) if (!p.seen.heroes.includes(h.heroId)) p.seen.heroes.push(h.heroId);
  if (run.mode === 'daily') {
    const key = run.dateKey ?? '';
    const rec = (p.daily[key] ??= { attempts: 0, bestScore: 0, won: false });
    rec.attempts++;
    return;
  }
  p.stats.runsPlayed++;
  for (const h of run.heroes) {
    const rec = (p.stats.perHero[h.heroId] ??= { runs: 0, wins: 0 });
    rec.runs++;
  }
}

function mergeLifetime(into: StatCounters, from: StatCounters): void {
  for (const k in from) {
    const key = k as StatKey;
    const v = from[key] ?? 0;
    if (MAX_STATS.includes(key)) into[key] = Math.max(into[key] ?? 0, v);
    else into[key] = (into[key] ?? 0) + v;
  }
}

/** Profile bookkeeping, feats and score when a run ends (won, lost or abandoned). */
export function recordRunEnd(c: Ctx, won: boolean): void {
  const run = c.run;
  const p = profile(c);
  if (run.mode === 'tutorial') {
    p.tutorialDone = true;
    c.ev.push({ type: 'runEnded', won, score: 0 });
    return;
  }
  run.score = computeScore(c, won);
  if (run.mode === 'daily') {
    const rec = (p.daily[run.dateKey ?? ''] ??= { attempts: 1, bestScore: 0, won: false });
    if (run.score > rec.bestScore) rec.bestScore = run.score;
    if (won && !rec.won) {
      rec.won = true;
      p.stats.dailyWins++;
    }
  } else if (won) {
    p.stats.runsWon++;
    p.stats.winStreak++;
    if (p.stats.winStreak > p.stats.bestStreak) p.stats.bestStreak = p.stats.winStreak;
    if (run.tier > p.stats.tierWon) p.stats.tierWon = run.tier;
    for (const h of run.heroes) {
      const rec = (p.stats.perHero[h.heroId] ??= { runs: 1, wins: 0 });
      rec.wins++;
    }
    const next = Math.min(c.db.maxTier, run.tier + 1);
    if (next > p.maxTier) {
      p.maxTier = next;
      c.ev.push({ type: 'unlocked', kind: 'tier', id: String(next) });
    }
  } else {
    p.stats.winStreak = 0;
  }
  if (won) checkFeats(c, 'runWon');
  checkFeats(c, 'runEnded');
  mergeLifetime(p.stats.lifetime, run.stats.run);
  c.ev.push({ type: 'runEnded', won, score: run.score });
}
