/** Action legality, execution and enumeration. `check` is the single source of truth for what is legal. */
import type { Action, FightState, HeroId, RunState, TargetRef } from '@shared';
import { endTurnCore, reroll, rerollInfo, startTurn, toggleLock, useDie } from './combat';
import type { Ctx } from './ctx';
import { computeEff, partNeedsTarget } from './faces';
import { dailyHeroes, dailySeed, recordRunEnd } from './meta';
import { rand32 } from './rng';
import {
  canUpgrade, eventChoice, itemPlacementError, leave, pickDoor, pickReward, restHeal, restUpgrade, settle, shopBuy, skipReward, startNewRun,
} from './run';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const isIndex = (n: unknown, len: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < len;

/** Legal targets for a die showing its current face. Empty when no target tap is needed. */
export function dieTargets(c: Ctx, di: number): { needsTarget: boolean; targets: TargetRef[] } {
  const f = c.run.fight!;
  const p = computeEff(c, di).parts[0]!;
  if (!partNeedsTarget(p)) return { needsTarget: false, targets: [] };
  const targets: TargetRef[] = [];
  if (p.effect === 'damage' || p.effect === 'weaken') {
    for (const e of f.enemies) if (e.hp > 0) targets.push({ side: 'enemy', uid: e.uid });
  } else {
    c.run.heroes.forEach((h, index) => { if (!h.downed) targets.push({ side: 'hero', index }); });
  }
  return { needsTarget: true, targets };
}

function dieUsable(run: RunState, f: FightState, di: unknown): di is number {
  if (!isIndex(di, f.dice.length)) return false;
  const d = f.dice[di]!;
  return !d.used && !run.heroes[d.hero]!.downed;
}

function upgradeError(c: Ctx, hero: number | undefined, face: number | undefined): string | null {
  const h = isIndex(hero, c.run.heroes.length) ? c.run.heroes[hero] : undefined;
  if (!h) return 'choose a hero';
  if (!isIndex(face, h.faces.length) || !canUpgrade(c.db, h.faces[face])) return 'that face cannot be upgraded';
  return null;
}

/** Why the action is illegal right now, or null if it is legal. Reads only. */
export function check(c: Ctx, a: Action): string | null {
  const run = c.game.run;
  const db = c.db;
  switch (a.type) {
    case 'startRun': {
      if (run) return 'a run is already in progress';
      if (!Array.isArray(a.heroes) || a.heroes.length !== db.rules.partySize) return 'wrong party size';
      const p = c.game.profile;
      for (let i = 0; i < a.heroes.length; i++) {
        const id = a.heroes[i]!;
        if (!db.heroes.has(id) || !p.unlockedHeroes.includes(id)) return `hero not available: ${String(id)}`;
        if (a.heroes.indexOf(id) !== i) return 'heroes must be different';
      }
      if (!Number.isInteger(a.tier) || a.tier < 0 || a.tier > Math.min(p.maxTier, db.maxTier)) return 'tier not available';
      if (a.seed !== undefined && (typeof a.seed !== 'string' || a.seed === '')) return 'bad seed';
      return null;
    }
    case 'startDaily':
      if (run) return 'a run is already in progress';
      if (typeof a.dateKey !== 'string' || !DATE_KEY.test(a.dateKey)) return 'bad date key';
      return db.content.heroes.length >= db.rules.partySize ? null : 'not enough heroes';
    case 'startTutorial':
      if (run) return 'a run is already in progress';
      return db.content.tutorial.heroes.every((id) => db.heroes.has(id)) ? null : 'tutorial heroes missing';
    case 'abandonRun':
      return run && run.phase !== 'victory' && run.phase !== 'defeat' ? null : 'no run to abandon';
    case 'continue':
      return run && (run.phase === 'victory' || run.phase === 'defeat') ? null : 'nothing to continue from';
    default:
      break;
  }
  if (!run) return 'no run in progress';
  const f = run.fight;
  switch (a.type) {
    case 'toggleLock':
      if (run.phase !== 'fight' || !f || f.phase !== 'rolling') return 'not rolling';
      return dieUsable(run, f, a.die) ? null : 'no such die';
    case 'reroll': {
      if (run.phase !== 'fight' || !f || f.phase !== 'rolling') return 'not rolling';
      const info = rerollInfo(c);
      if (!info.dice.length) return 'no dice to reroll';
      return f.rerollsLeft > 0 || info.free ? null : 'no rerolls left';
    }
    case 'useDie': {
      if (run.phase !== 'fight' || !f) return 'not in a fight';
      if (!dieUsable(run, f, a.die)) return 'die cannot be used';
      const { needsTarget, targets } = dieTargets(c, a.die);
      if (!needsTarget) return null;
      const t = a.target;
      if (!t) return 'this die needs a target';
      for (const x of targets) {
        if (x.side === 'enemy' ? t.side === 'enemy' && t.uid === x.uid : t.side === 'hero' && t.index === x.index) return null;
      }
      return 'not a legal target';
    }
    case 'undo':
      return run.phase === 'fight' && f && f.undo.length > 0 ? null : 'nothing to undo';
    case 'endTurn':
      return run.phase === 'fight' && f ? null : 'not in a fight';
    case 'pickReward': {
      if (run.phase !== 'reward' || !run.reward) return 'no reward to pick';
      const o = isIndex(a.option, run.reward.options.length) ? run.reward.options[a.option] : undefined;
      if (!o) return 'no such option';
      if (o.type === 'item') return itemPlacementError(c, a.hero, a.replaceItem);
      if (a.hero !== undefined && a.hero !== o.hero) return 'this option is for another hero';
      if (o.type === 'upgrade') return upgradeError(c, o.hero, a.face);
      return isIndex(a.face, run.heroes[o.hero]!.faces.length) ? null : 'choose a face to replace';
    }
    case 'skipReward':
      return run.phase === 'reward' && run.reward ? null : 'no reward to skip';
    case 'pickDoor':
      return run.phase === 'doors' && run.doors && isIndex(a.door, run.doors.length) ? null : 'no such door';
    case 'restHeal':
      return run.phase === 'rest' && run.rest && !run.rest.used ? null : 'cannot rest now';
    case 'restUpgrade':
      if (run.phase !== 'rest' || !run.rest || run.rest.used) return 'cannot rest now';
      return upgradeError(c, a.hero, a.face);
    case 'shopBuy': {
      if (run.phase !== 'shop' || !run.shop) return 'not in a shop';
      const s = isIndex(a.slot, run.shop.slots.length) ? run.shop.slots[a.slot] : undefined;
      if (!s) return 'no such slot';
      if (s.sold) return 'already sold';
      if (run.gold < s.price) return 'not enough gold';
      switch (s.type) {
        case 'item': return itemPlacementError(c, a.hero, a.replaceItem);
        case 'face':
          if (a.hero !== undefined && a.hero !== s.hero) return 'this face is for another hero';
          return isIndex(a.face, run.heroes[s.hero]!.faces.length) ? null : 'choose a face to replace';
        case 'upgrade': return upgradeError(c, a.hero, a.face);
        case 'heal': return run.heroes.some((h) => !h.downed && h.hp < h.maxHp) ? null : 'nobody needs healing';
      }
      return null;
    }
    case 'leave':
      if (run.phase === 'rest' || run.phase === 'shop') return null;
      if (run.phase === 'event' && run.event) {
        if (run.event.chosen !== null) return null;
        const def = db.events.get(run.event.eventId);
        return !def || !def.choices.some((ch) => (ch.costGold ?? 0) <= run.gold) ? null : 'make a choice first';
      }
      return 'nothing to leave';
    case 'eventChoice': {
      if (run.phase !== 'event' || !run.event || run.event.chosen !== null) return 'no choice to make';
      const def = db.events.get(run.event.eventId);
      const ch = def && isIndex(a.choice, def.choices.length) ? def.choices[a.choice] : undefined;
      if (!ch) return 'no such choice';
      return (ch.costGold ?? 0) <= run.gold ? null : 'not enough gold';
    }
    default:
      return 'unknown action';
  }
}

function snapshot(run: RunState): string {
  const f = run.fight!;
  return JSON.stringify({
    h: run.heroes.map((h) => [h.hp, h.downed ? 1 : 0]),
    g: run.gold,
    f: { ...f, undo: [] },
    s: run.stats,
    l: run.limits,
    r: run.rng,
  });
}

function undo(c: Ctx): void {
  const run = c.run;
  const stack = run.fight!.undo;
  const s = JSON.parse(stack[stack.length - 1]!) as {
    h: [number, number][]; g: number; f: FightState; s: RunState['stats']; l: RunState['limits']; r: RunState['rng'];
  };
  run.heroes.forEach((h, i) => {
    h.hp = s.h[i]![0];
    h.downed = s.h[i]![1] === 1;
  });
  run.gold = s.g;
  run.fight = s.f;
  run.fight.undo = stack.slice(0, -1);
  run.stats = s.s;
  run.limits = s.l;
  run.rng = s.r;
  c.mods = null;
  c.ev.push({ type: 'undone' });
}

/** Performs an action that `check` has accepted, on the Ctx's private copy. */
export function exec(c: Ctx, a: Action): void {
  switch (a.type) {
    case 'startRun': {
      const p = c.game.profile;
      const seed = a.seed ?? `auto-${p.stats.runsPlayed}-${rand32(a.heroes.join('+'), `tier${a.tier}`, p.stats.runsPlayed + p.featsDone.length * 7919).toString(36)}`;
      startNewRun(c, a.heroes, a.tier, seed, 'standard', null);
      return;
    }
    case 'startDaily':
      startNewRun(c, dailyHeroes(c.db, a.dateKey), 0, dailySeed(a.dateKey), 'daily', a.dateKey);
      return;
    case 'startTutorial':
      startNewRun(c, c.db.content.tutorial.heroes, 0, c.db.content.tutorial.seed, 'tutorial', null);
      return;
    case 'abandonRun':
      c.run.phase = 'defeat';
      recordRunEnd(c, false);
      c.game.run = null;
      return;
    case 'continue':
      c.game.run = null;
      return;
    case 'toggleLock':
      toggleLock(c, a.die);
      settle(c);
      return;
    case 'reroll':
      reroll(c);
      settle(c);
      return;
    case 'useDie': {
      const f = c.run.fight!;
      f.undo.push(snapshot(c.run));
      useDie(c, a.die, a.target);
      settle(c);
      return;
    }
    case 'undo':
      undo(c);
      return;
    case 'endTurn':
      endTurnCore(c);
      if (!c.over) startTurn(c);
      settle(c);
      return;
    case 'pickReward': pickReward(c, a.option, a.hero, a.face, a.replaceItem); return;
    case 'skipReward': skipReward(c); return;
    case 'pickDoor': pickDoor(c, a.door); return;
    case 'restHeal': restHeal(c); return;
    case 'restUpgrade': restUpgrade(c, a.hero, a.face); return;
    case 'shopBuy': shopBuy(c, a.slot, a.hero, a.face, a.replaceItem); return;
    case 'leave': leave(c); return;
    case 'eventChoice': eventChoice(c, a.choice); return;
  }
}

function itemPlacements(c: Ctx): { hero: number; replaceItem?: number }[] {
  const out: { hero: number; replaceItem?: number }[] = [];
  c.run.heroes.forEach((h, hero) => {
    const slots = c.db.heroes.get(h.heroId)?.itemSlots ?? 0;
    if (h.items.length < slots) out.push({ hero });
    else h.items.forEach((_, replaceItem) => out.push({ hero, replaceItem }));
  });
  return out;
}

/**
 * Every legal gameplay action. Two always-available meta actions are deliberately left out so that
 * bots and fuzzers do not trip over them: `abandonRun` (legal in any unfinished run) and
 * `startDaily` (legal with any date whenever no run is in progress).
 */
export function legalActions(c: Ctx): Action[] {
  const run = c.game.run;
  const db = c.db;
  const out: Action[] = [];
  if (!run) {
    const p = c.game.profile;
    const ids = db.content.heroes.map((h) => h.id).filter((id) => p.unlockedHeroes.includes(id));
    const n = db.rules.partySize;
    const maxTier = Math.min(p.maxTier, db.maxTier);
    const combo: HeroId[] = [];
    const rec = (from: number): void => {
      if (combo.length === n) {
        for (let tier = 0; tier <= maxTier; tier++) out.push({ type: 'startRun', heroes: combo.slice() as [HeroId, HeroId, HeroId], tier });
        return;
      }
      for (let i = from; i < ids.length; i++) {
        combo.push(ids[i]!);
        rec(i + 1);
        combo.pop();
      }
    };
    rec(0);
    if (check(c, { type: 'startTutorial' }) === null) out.push({ type: 'startTutorial' });
    return out;
  }
  switch (run.phase) {
    case 'victory':
    case 'defeat':
      out.push({ type: 'continue' });
      break;
    case 'fight': {
      const f = run.fight;
      if (!f) break;
      if (f.phase === 'rolling') {
        for (let die = 0; die < f.dice.length; die++) if (dieUsable(run, f, die)) out.push({ type: 'toggleLock', die });
        if (check(c, { type: 'reroll' }) === null) out.push({ type: 'reroll' });
      }
      for (let die = 0; die < f.dice.length; die++) {
        if (!dieUsable(run, f, die)) continue;
        const { needsTarget, targets } = dieTargets(c, die);
        if (!needsTarget) out.push({ type: 'useDie', die });
        else for (const target of targets) out.push({ type: 'useDie', die, target });
      }
      if (f.undo.length > 0) out.push({ type: 'undo' });
      out.push({ type: 'endTurn' });
      break;
    }
    case 'reward': {
      const r = run.reward;
      if (!r) break;
      r.options.forEach((o, option) => {
        if (o.type === 'item') for (const pl of itemPlacements(c)) out.push({ type: 'pickReward', option, ...pl });
        else {
          run.heroes[o.hero]!.faces.forEach((fc, face) => {
            if (o.type === 'face' || canUpgrade(db, fc)) out.push({ type: 'pickReward', option, face });
          });
        }
      });
      out.push({ type: 'skipReward' });
      break;
    }
    case 'doors':
      (run.doors ?? []).forEach((_, door) => out.push({ type: 'pickDoor', door }));
      break;
    case 'rest':
      if (run.rest && !run.rest.used) {
        out.push({ type: 'restHeal' });
        run.heroes.forEach((h, hero) => h.faces.forEach((fc, face) => { if (canUpgrade(db, fc)) out.push({ type: 'restUpgrade', hero, face }); }));
      }
      out.push({ type: 'leave' });
      break;
    case 'shop':
      (run.shop?.slots ?? []).forEach((s, slot) => {
        if (s.sold || run.gold < s.price) return;
        switch (s.type) {
          case 'item': for (const pl of itemPlacements(c)) out.push({ type: 'shopBuy', slot, ...pl }); break;
          case 'face': run.heroes[s.hero]!.faces.forEach((_, face) => out.push({ type: 'shopBuy', slot, face })); break;
          case 'upgrade':
            run.heroes.forEach((h, hero) => h.faces.forEach((fc, face) => { if (canUpgrade(db, fc)) out.push({ type: 'shopBuy', slot, hero, face }); }));
            break;
          case 'heal': if (check(c, { type: 'shopBuy', slot }) === null) out.push({ type: 'shopBuy', slot }); break;
        }
      });
      out.push({ type: 'leave' });
      break;
    case 'event': {
      const ev = run.event;
      if (!ev) break;
      if (ev.chosen === null) {
        const def = db.events.get(ev.eventId);
        (def?.choices ?? []).forEach((ch, choice) => { if ((ch.costGold ?? 0) <= run.gold) out.push({ type: 'eventChoice', choice }); });
      }
      if (check(c, { type: 'leave' }) === null) out.push({ type: 'leave' });
      break;
    }
  }
  return out;
}
