/**
 * Read-only views: die views, die previews, the enemy forecast, the set preview.
 * Previews are exact because they run the real resolution code on a private copy and compare.
 */
import type { ActiveSet, DiePreview, DieView, EnemyForecast, GameState, RunState, TargetRef } from '@shared';
import { IllegalActionError } from '@shared';
import { check, dieTargets } from './actions';
import { endRolling, endTurnCore, useDie } from './combat';
import type { Ctx } from './ctx';
import { makeCtx } from './ctx';
import type { Db } from './db';
import { computeEff, detectSets } from './faces';

function inFight(game: GameState): boolean {
  return !!game.run && game.run.phase === 'fight' && !!game.run.fight;
}

export function dice(db: Db, game: GameState): DieView[] {
  if (!inFight(game)) return [];
  const read = makeCtx(db, game, false);
  const f = read.run.fight!;
  // While rolling, values are shown as they would resolve if rolling ended now (set bonus included).
  let work = read;
  if (f.phase === 'rolling') {
    work = makeCtx(db, game, true, true);
    endRolling(work);
  }
  const out: DieView[] = [];
  for (let i = 0; i < f.dice.length; i++) {
    const d = f.dice[i]!;
    const eff = computeEff(work, i);
    const p = eff.parts[0]!;
    const usable = !d.used && !read.run.heroes[d.hero]!.downed;
    const t = usable ? dieTargets(read, i) : { needsTarget: false, targets: [] };
    out.push({
      die: i, hero: d.hero, faceIndex: d.face, effect: p.effect, symbol: eff.symbol, value: p.value, keywords: p.keywords.slice(),
      cursed: eff.cursed, locked: d.locked, jammed: d.jammed, used: d.used, needsTarget: t.needsTarget, targets: t.targets, usable,
      echoOf: eff.echo ? eff.echoOf : null,
    });
  }
  return out;
}

/** The set the dice on the table form (or would form if rolling ended now). */
export function previewSets(db: Db, game: GameState): ActiveSet[] {
  if (!inFight(game)) return [];
  const c = makeCtx(db, game, false);
  const f = c.run.fight!;
  return f.phase === 'rolling' ? detectSets(c).map((x) => x.set) : f.sets;
}

interface UnitSnap {
  hp: number;
  shield: number;
  poison: number;
  weak: number;
}

function snapUnits(run: RunState): { heroes: UnitSnap[]; enemies: Map<number, UnitSnap> } {
  const f = run.fight!;
  const enemies = new Map<number, UnitSnap>();
  for (const e of f.enemies) enemies.set(e.uid, { hp: e.hp, shield: e.shield, poison: e.statuses.poison ?? 0, weak: e.statuses.weak ?? 0 });
  const heroes = run.heroes.map((h, i) => {
    const hf = f.heroes[i]!;
    return { hp: h.downed ? 0 : h.hp, shield: hf.shield + hf.ward, poison: hf.statuses.poison ?? 0, weak: hf.statuses.weak ?? 0 };
  });
  return { heroes, enemies };
}

const sameRef = (a: TargetRef | undefined, b: TargetRef): boolean =>
  !!a && (a.side === 'enemy' ? b.side === 'enemy' && a.uid === b.uid : b.side === 'hero' && a.index === b.index);

export function previewDie(db: Db, game: GameState, die: number, target: TargetRef | undefined): DiePreview {
  const err = check(makeCtx(db, game, false), { type: 'useDie', die, target });
  if (err) throw new IllegalActionError(err);
  const c: Ctx = makeCtx(db, game, true, true);
  const run = c.run;
  const user = run.fight!.dice[die]!.hero;
  const before = snapUnits(run);
  const rerollsBefore = run.fight!.nextTurnRerolls;
  useDie(c, die, target);
  const after = snapUnits(run);
  const hits: DiePreview['hits'] = [];
  const add = (ref: TargetRef, b: UnitSnap, a: UnitSnap | undefined, isUser: boolean): void => {
    const hpAfter = a ? a.hp : 0;
    const shAfter = a ? a.shield : 0;
    const hit = {
      target: ref,
      hpLoss: Math.max(0, b.hp - hpAfter),
      shieldLoss: Math.max(0, b.shield - shAfter),
      shieldGain: Math.max(0, shAfter - b.shield),
      heal: Math.max(0, hpAfter - b.hp),
      poison: a ? Math.max(0, a.poison - b.poison) : 0,
      weaken: a ? Math.max(0, a.weak - b.weak) : 0,
      kills: b.hp > 0 && hpAfter <= 0,
    };
    const other = hit.shieldLoss || hit.shieldGain || hit.heal || hit.poison || hit.weaken;
    const changed = hit.hpLoss || other;
    if (sameRef(target, ref) || (isUser ? other : changed)) hits.push(hit);
  };
  for (const [uid, b] of before.enemies) add({ side: 'enemy', uid }, b, after.enemies.get(uid), false);
  before.heroes.forEach((b, index) => {
    if (b.hp > 0) add({ side: 'hero', index }, b, after.heroes[index], index === user);
  });
  return {
    hits,
    selfHpLoss: Math.max(0, before.heroes[user]!.hp - after.heroes[user]!.hp),
    rerollsNextTurn: run.fight!.nextTurnRerolls - rerollsBefore,
  };
}

export function forecast(db: Db, game: GameState): EnemyForecast {
  if (!inFight(game)) {
    return { heroes: (game.run?.heroes ?? []).map(() => ({ hpLoss: 0, shieldLoss: 0, downed: false, jammed: false, cursedFace: null })), rerollsStolen: 0, partyWipe: false };
  }
  const c = makeCtx(db, game, true, true);
  const run = c.run;
  const before = snapUnits(run);
  const cursedBefore = run.fight!.heroes.map((h) => h.cursed.slice());
  const wasDown = run.heroes.map((h) => h.downed);
  endTurnCore(c);
  const f = run.fight!;
  const after = snapUnits(run);
  const heroes = run.heroes.map((h, i) => {
    const b = before.heroes[i]!;
    const a = after.heroes[i]!;
    const newCurse = f.heroes[i]!.cursed.find((x) => !cursedBefore[i]!.includes(x));
    return {
      hpLoss: Math.max(0, b.hp - a.hp),
      shieldLoss: Math.max(0, b.shield - a.shield),
      downed: h.downed && !wasDown[i],
      jammed: f.nextTurnJams.includes(i),
      cursedFace: newCurse === undefined ? null : newCurse,
    };
  });
  return { heroes, rerollsStolen: c.stolen, partyWipe: run.heroes.every((h) => h.downed) };
}
