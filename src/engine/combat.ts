/**
 * Fight rules: damage, statuses, the trigger/effect language, enemy intents, the enemy phase,
 * turn flow and die use. Everything here mutates the private copy held by a Ctx.
 */
import type {
  ActiveSet, Amount, Condition, CompareOp, CurseFaceRule, DieSelector, Effect, EncounterDef, EnemyAction, EnemyDef, EnemyId,
  EnemyState, EnemyTargetRule, FightState, GameEvent, HeroTargetRule, Intent, ItemId, ResolvedEnemyAction, Selector, Statuses,
  StatusId, TargetRef, Trigger, TrickKind,
} from '@shared';
import type { Ctx } from './ctx';
import { activeMods, bump, bumpMax, seen, sumAllMods } from './ctx';
import type { TrigRef } from './db';
import type { Eff, Part } from './faces';
import { blanksShowing, computeEff, detectSets, matches } from './faces';
import { checkFeats } from './meta';
import { aiStream, diceStream, nextInt } from './rng';

const MAX_TRIGGER_DEPTH = 6;

type Cause = Extract<GameEvent, { type: 'damage' }>['cause'];

/** Who owns a triggered effect: an item's holder, an enemy with a passive, or nobody (a set burst). */
type Owner = { item: ItemId; hero: number } | { enemy: EnemyState } | null;

/** What a trigger is about. */
export interface TCtx {
  die?: number;
  eff?: Eff;
  /** Hero involved (damaged / downed). */
  hero?: number;
  /** The unit damaged / killed / aimed at. */
  subject?: TargetRef | null;
  subjE?: EnemyState;
  subjStatuses?: Statuses;
  /** The unit that caused it. */
  source?: TargetRef | null;
  value?: number;
  set?: ActiveSet;
}

interface DmgOpts {
  cause: Cause;
  source: TargetRef | null;
  pierce?: boolean;
  /** Ignores shield and mark (poison, Reckless). */
  raw?: boolean;
  /** Cannot reduce the unit below 1 HP. */
  floor1?: boolean;
  /** The hit can be answered by thorns. */
  thorns?: boolean;
}

const heroRef = (index: number): TargetRef => ({ side: 'hero', index });
const enemyRef = (e: EnemyState): TargetRef => ({ side: 'enemy', uid: e.uid });

export function findEnemy(f: FightState, uid: number): EnemyState | undefined {
  for (const e of f.enemies) if (e.uid === uid) return e;
  return undefined;
}

function alive(c: Ctx, r: TargetRef | null | undefined): r is TargetRef {
  if (!r) return false;
  if (r.side === 'hero') {
    const h = c.run.heroes[r.index];
    return !!h && !h.downed;
  }
  const e = findEnemy(c.run.fight!, r.uid);
  return !!e && e.hp > 0;
}

function livingHeroes(c: Ctx): number[] {
  const out: number[] = [];
  const hs = c.run.heroes;
  for (let i = 0; i < hs.length; i++) if (!hs[i]!.downed) out.push(i);
  return out;
}

// ---------------------------------------------------------------- gold / heal / shield / status

export function addGold(c: Ctx, amount: number, scaled: boolean, quiet = false): number {
  const n = scaled && amount > 0 ? Math.floor((amount * (100 + sumAllMods(c, 'goldGainPct'))) / 100) : amount;
  const before = c.run.gold;
  c.run.gold = Math.max(0, before + n);
  if (n > 0) bump(c, 'goldEarned', n);
  if (!quiet && n !== 0) c.ev.push({ type: 'gold', amount: c.run.gold - before });
  return n;
}

/** Heals a living hero (works in and out of fights). Returns HP actually restored. */
export function healHero(c: Ctx, hi: number, amount: number): number {
  const h = c.run.heroes[hi]!;
  if (h.downed || amount <= 0) return 0;
  const pct = c.db.tier(c.run.tier).healingPct;
  const amt = pct === 0 ? amount : Math.max(0, Math.floor((amount * (100 + pct)) / 100));
  const n = Math.min(h.maxHp - h.hp, amt);
  if (n <= 0) return 0;
  h.hp += n;
  bump(c, 'healingDone', n);
  c.ev.push({ type: 'heal', target: heroRef(hi), amount: n });
  return n;
}

function phaseIdx(def: EnemyDef, hp: number, maxHp: number): number {
  if (!def.phases) return -1;
  let idx = -1;
  let best = Infinity;
  for (let i = 0; i < def.phases.length; i++) {
    const p = def.phases[i]!;
    if (hp * 100 <= p.hpAtMostPct * maxHp && p.hpAtMostPct < best) {
      best = p.hpAtMostPct;
      idx = i;
    }
  }
  return idx;
}

function healEnemy(c: Ctx, e: EnemyState, amount: number): void {
  if (e.hp <= 0 || amount <= 0) return;
  const n = Math.min(e.maxHp - e.hp, amount);
  if (n <= 0) return;
  const def = c.db.enemies.get(e.enemyId)!;
  const before = phaseIdx(def, e.hp, e.maxHp);
  e.hp += n;
  c.ev.push({ type: 'heal', target: enemyRef(e), amount: n });
  if (phaseIdx(def, e.hp, e.maxHp) !== before) {
    e.cursor = 0;
    if (!c.enemyPhase) pickIntent(c, e);
  }
}

function giveShield(c: Ctx, r: TargetRef, amount: number, ward: boolean): void {
  if (amount <= 0 || !alive(c, r)) return;
  const f = c.run.fight!;
  if (r.side === 'hero') {
    let n = amount;
    for (const { m, h } of activeMods(c)) if (m.type === 'shieldGain' && (m.scope === 'party' || h === r.index)) n += m.amount;
    if (n <= 0) return;
    const hf = f.heroes[r.index]!;
    if (ward) hf.ward += n;
    else hf.shield += n;
    bump(c, 'shieldGained', n);
    c.ev.push({ type: 'shield', target: r, amount: n });
  } else {
    const e = findEnemy(f, r.uid)!;
    e.shield += amount;
    if (c.phaseShield) c.phaseShield[e.uid] = (c.phaseShield[e.uid] ?? 0) + amount;
    c.ev.push({ type: 'shield', target: r, amount });
  }
}

/** Adds (or with a negative amount removes) status stacks. `byParty` = applied by the heroes' side. */
function addStatus(c: Ctx, r: TargetRef, status: StatusId, amount: number, byParty: boolean): void {
  if (amount === 0 || !alive(c, r)) return;
  const f = c.run.fight!;
  let n = amount;
  if (byParty && n > 0) for (const { m } of activeMods(c)) if (m.type === 'statusPotency' && m.status === status) n += m.amount;
  const e = r.side === 'enemy' ? findEnemy(f, r.uid)! : null;
  const st = e ? e.statuses : f.heroes[(r as { index: number }).index]!.statuses;
  const before = st[status] ?? 0;
  const after = Math.max(0, before + n);
  if (after === before) return;
  if (after === 0) delete st[status];
  else st[status] = after;
  c.ev.push({ type: 'status', target: r, status, amount: after - before });
  if (e) {
    if (status === 'poison' && byParty && after > before) bump(c, 'poisonApplied', after - before);
    if (status === 'strength') refreshAttackAmounts(c, e);
  }
}

// ---------------------------------------------------------------- damage

function dmgEnemy(c: Ctx, e: EnemyState, amount: number, o: DmgOpts): void {
  if (c.over || e.hp <= 0) return;
  const f = c.run.fight!;
  let amt = amount;
  if (!o.raw) amt += e.statuses.mark ?? 0;
  if (amt < 0) amt = 0;
  let blocked = 0;
  if (!o.raw && !o.pierce && e.shield > 0) {
    blocked = Math.min(e.shield, amt);
    e.shield -= blocked;
  }
  const lost = Math.min(e.hp, amt - blocked);
  const def = c.db.enemies.get(e.enemyId)!;
  const phaseBefore = phaseIdx(def, e.hp, e.maxHp);
  const thorns = o.thorns ? (e.statuses.thorns ?? 0) : 0;
  e.hp -= lost;
  const ref = enemyRef(e);
  c.ev.push({ type: 'damage', target: ref, amount: lost, blocked, source: o.source, cause: o.cause });
  if (o.cause === 'die') bumpMax(c, 'biggestHit', amt);
  if (lost > 0) {
    bump(c, 'damageDealt', lost);
    if (o.cause === 'die' && c.cur?.blank) bump(c, 'blankDamage', lost);
    fire(c, 'enemyDamaged', { subject: ref, subjE: e, source: o.source, value: lost, die: c.cur?.die });
  }
  if (e.hp <= 0) kill(c, e, o.source);
  else if (f.enemies.includes(e) && phaseIdx(def, e.hp, e.maxHp) !== phaseBefore) {
    e.cursor = 0;
    if (!c.enemyPhase) pickIntent(c, e);
  }
  if (thorns > 0 && o.source && o.source.side === 'hero') {
    dmgHero(c, o.source.index, thorns, { cause: 'thorns', source: ref });
  }
}

function kill(c: Ctx, e: EnemyState, source: TargetRef | null): void {
  if (c.dying.includes(e.uid)) return;
  const f = c.run.fight!;
  if (!f.enemies.includes(e)) return;
  c.dying.push(e.uid);
  e.hp = 0;
  const ref = enemyRef(e);
  c.ev.push({ type: 'unitDown', target: ref });
  bump(c, 'enemiesKilled', 1);
  const gold = c.db.enemies.get(e.enemyId)!.gold ?? 0;
  if (gold > 0) addGold(c, gold, true);
  fire(c, 'enemyKilled', { subject: ref, subjE: e, source, die: c.cur?.die });
  const i = f.enemies.indexOf(e);
  if (i >= 0) f.enemies.splice(i, 1);
  if (f.enemies.length === 0 && c.over === 0) c.over = 1;
}

function dmgHero(c: Ctx, hi: number, amount: number, o: DmgOpts): void {
  const h = c.run.heroes[hi]!;
  if (c.over || h.downed) return;
  const f = c.run.fight!;
  const hf = f.heroes[hi]!;
  let amt = amount;
  if (!o.raw) amt += hf.statuses.mark ?? 0;
  if (amt < 0) amt = 0;
  let blocked = 0;
  if (!o.raw && !o.pierce) {
    const s = Math.min(hf.shield, amt);
    hf.shield -= s;
    const w = Math.min(hf.ward, amt - s);
    hf.ward -= w;
    blocked = s + w;
  }
  let lost = Math.min(h.hp, amt - blocked);
  if (o.floor1) lost = Math.max(0, Math.min(lost, h.hp - 1));
  const thorns = o.thorns ? (hf.statuses.thorns ?? 0) : 0;
  h.hp -= lost;
  const ref = heroRef(hi);
  c.ev.push({ type: 'damage', target: ref, amount: lost, blocked, source: o.source, cause: o.cause });
  if (lost > 0) {
    bump(c, 'hpLost', lost);
    fire(c, 'heroDamaged', { hero: hi, subject: ref, source: o.source, value: lost });
  }
  if (h.hp <= 0 && !h.downed) down(c, hi);
  if (thorns > 0 && o.source && o.source.side === 'enemy') {
    const e = findEnemy(f, o.source.uid);
    if (e) dmgEnemy(c, e, thorns, { cause: 'thorns', source: ref });
  }
}

function down(c: Ctx, hi: number): void {
  const h = c.run.heroes[hi]!;
  const hf = c.run.fight!.heroes[hi]!;
  const statuses = hf.statuses;
  h.downed = true;
  h.hp = 0;
  hf.shield = 0;
  hf.ward = 0;
  hf.statuses = {};
  c.mods = null;
  const ref = heroRef(hi);
  c.ev.push({ type: 'unitDown', target: ref });
  bump(c, 'heroesDowned', 1);
  fire(c, 'heroDowned', { hero: hi, subject: ref, subjStatuses: statuses });
  if (c.over === 0 && c.run.heroes.every((x) => x.downed)) c.over = 2;
}

// ---------------------------------------------------------------- triggers, conditions, effects

function cmp(a: number, op: CompareOp, b: number): boolean {
  return op === '>=' ? a >= b : op === '<=' ? a <= b : a === b;
}

function allDiceUsed(c: Ctx): boolean {
  for (const d of c.run.fight!.dice) if (!d.used && !c.run.heroes[d.hero]!.downed) return false;
  return true;
}

function unusedDice(c: Ctx): number {
  let n = 0;
  for (const d of c.run.fight!.dice) if (!d.used && !c.run.heroes[d.hero]!.downed) n++;
  return n;
}

function subjectStatuses(c: Ctx, t: TCtx): Statuses {
  if (t.subjStatuses) return t.subjStatuses;
  if (t.subjE) return t.subjE.statuses;
  const s = t.subject;
  if (!s) return {};
  if (s.side === 'hero') return c.run.fight!.heroes[s.index]?.statuses ?? {};
  return findEnemy(c.run.fight!, s.uid)?.statuses ?? {};
}

function cond(c: Ctx, k: Condition, owner: Owner, t: TCtx): boolean {
  const f = c.run.fight!;
  switch (k.type) {
    case 'ownerDie':
      return !!owner && 'hero' in owner && t.die !== undefined && f.dice[t.die]?.hero === owner.hero;
    case 'face': {
      const eff = t.eff ?? (t.die !== undefined && f.dice[t.die] ? computeEff(c, t.die) : undefined);
      return !!eff && matches(k.filter, eff.parts[0]!, eff);
    }
    case 'set': {
      const ok = (s: ActiveSet): boolean => (k.kind === undefined || s.kind === k.kind) && (k.symbol === undefined || s.symbol === k.symbol);
      return t.set ? ok(t.set) : f.sets.some(ok);
    }
    case 'hpAtMostPct': {
      if (!owner) return false;
      if ('enemy' in owner) return owner.enemy.hp * 100 <= k.pct * owner.enemy.maxHp;
      const h = c.run.heroes[owner.hero]!;
      return h.hp * 100 <= k.pct * h.maxHp;
    }
    case 'turn': return cmp(f.turn, k.op, k.value);
    case 'rerollsSpent': return cmp(f.rerollsSpent, k.op, k.value);
    case 'diceUsed': return cmp(f.diceUsed, k.op, k.value);
    case 'unusedDice': return cmp(unusedDice(c), k.op, k.value);
    case 'allDiceUsed': return allDiceUsed(c);
    case 'ownerInvolved':
      if (!owner) return false;
      if ('enemy' in owner) return !!t.subject && t.subject.side === 'enemy' && t.subject.uid === owner.enemy.uid;
      return t.hero === owner.hero;
    case 'targetHasStatus': return (subjectStatuses(c, t)[k.status] ?? 0) > 0;
    case 'all': return k.of.every((x) => cond(c, x, owner, t));
    case 'any': return k.of.some((x) => cond(c, x, owner, t));
    case 'not': return !cond(c, k.of, owner, t);
  }
}

function amountOf(c: Ctx, a: Amount, t: TCtx): number {
  if (typeof a === 'number') return a;
  const f = c.run.fight!;
  let base = 0;
  switch (a.scale) {
    case 'triggerValue': base = t.value ?? 0; break;
    case 'rerollsLeft': base = f.rerollsLeft; break;
    case 'rerollsSpent': base = f.rerollsSpent; break;
    case 'unusedDice': base = unusedDice(c); break;
    case 'setSize': base = (t.set ?? f.sets[0])?.dice.length ?? 0; break;
    case 'targetStatus': base = a.status ? (subjectStatuses(c, t)[a.status] ?? 0) : 0; break;
    case 'blanksShowing': base = blanksShowing(c); break;
  }
  return Math.floor(base * a.factor) + (a.plus ?? 0);
}

function minBy(list: number[], hp: (i: number) => number): number {
  let best = list[0]!;
  for (const i of list) if (hp(i) < hp(best)) best = i;
  return best;
}

function select(c: Ctx, sel: Selector, owner: Owner, t: TCtx): TargetRef[] {
  const run = c.run;
  const f = run.fight!;
  switch (sel) {
    case 'owner':
    case 'self': {
      if (!owner) return [];
      const r = 'enemy' in owner ? enemyRef(owner.enemy) : heroRef(owner.hero);
      return alive(c, r) ? [r] : [];
    }
    case 'allHeroes': return livingHeroes(c).map(heroRef);
    case 'frontHero': {
      const l = livingHeroes(c);
      return l.length ? [heroRef(l[0]!)] : [];
    }
    case 'lowestHpHero': {
      const l = livingHeroes(c);
      return l.length ? [heroRef(minBy(l, (i) => run.heroes[i]!.hp))] : [];
    }
    case 'randomHero': {
      const l = livingHeroes(c);
      return l.length ? [heroRef(l[nextInt(run, aiStream(run), l.length)]!)] : [];
    }
    case 'allEnemies': return f.enemies.filter((e) => e.hp > 0).map(enemyRef);
    case 'frontEnemy': {
      const e = f.enemies.find((x) => x.hp > 0);
      return e ? [enemyRef(e)] : [];
    }
    case 'lowestHpEnemy': {
      let best: EnemyState | null = null;
      for (const e of f.enemies) if (e.hp > 0 && (!best || e.hp < best.hp)) best = e;
      return best ? [enemyRef(best)] : [];
    }
    case 'randomEnemy': {
      const l = f.enemies.filter((e) => e.hp > 0);
      return l.length ? [enemyRef(l[nextInt(run, aiStream(run), l.length)]!)] : [];
    }
    case 'otherEnemies': {
      const except = t.subjE ?? (t.subject && t.subject.side === 'enemy' ? findEnemy(f, t.subject.uid) : owner && 'enemy' in owner ? owner.enemy : undefined);
      return f.enemies.filter((e) => e.hp > 0 && e !== except).map(enemyRef);
    }
    case 'triggerTarget': return alive(c, t.subject) ? [t.subject] : [];
    case 'triggerSource': return alive(c, t.source) ? [t.source] : [];
  }
}

function selectDice(c: Ctx, sel: DieSelector, owner: Owner, t: TCtx): number[] {
  const f = c.run.fight!;
  const ownerDie = owner && 'hero' in owner ? f.dice.findIndex((d) => d.hero === owner.hero) : -1;
  switch (sel) {
    case 'triggerDie': return t.die !== undefined && f.dice[t.die] ? [t.die] : [];
    case 'ownerDie': return ownerDie >= 0 ? [ownerDie] : [];
    case 'allDice': return f.dice.map((_, i) => i);
    case 'otherDice': {
      const except = t.die !== undefined ? t.die : ownerDie;
      return f.dice.map((_, i) => i).filter((i) => i !== except);
    }
    case 'setDice': {
      if (t.set) return t.set.dice.slice();
      const out: number[] = [];
      for (const s of f.sets) for (const d of s.dice) if (!out.includes(d)) out.push(d);
      return out;
    }
  }
}

/** Applies one effect. `mult` scales amounts (triple burst multiplier). */
export function applyEffect(c: Ctx, e: Effect, owner: Owner, t: TCtx, mult: number): void {
  if (c.over) return;
  const f = c.run.fight!;
  const enemySide = !!owner && 'enemy' in owner;
  const cause: Cause = owner === null ? 'set' : enemySide ? 'passive' : 'item';
  const src: TargetRef | null = owner === null ? null : 'enemy' in owner ? enemyRef(owner.enemy) : heroRef(owner.hero);
  const amt = (a: Amount): number => Math.floor(amountOf(c, a, t) * mult);
  switch (e.type) {
    case 'damage': {
      const n = Math.max(0, amt(e.amount));
      for (const r of select(c, e.target, owner, t)) {
        if (c.over) return;
        if (r.side === 'hero') dmgHero(c, r.index, n, { cause, source: src, pierce: e.pierce });
        else {
          const en = findEnemy(f, r.uid);
          if (en) dmgEnemy(c, en, n, { cause, source: src, pierce: e.pierce });
        }
      }
      break;
    }
    case 'shield': {
      const n = amt(e.amount);
      for (const r of select(c, e.target, owner, t)) giveShield(c, r, n, !!e.ward);
      break;
    }
    case 'heal': {
      const n = amt(e.amount);
      for (const r of select(c, e.target, owner, t)) {
        if (r.side === 'hero') healHero(c, r.index, n);
        else {
          const en = findEnemy(f, r.uid);
          if (en) healEnemy(c, en, n);
        }
      }
      break;
    }
    case 'status': {
      const n = amt(e.amount);
      for (const r of select(c, e.target, owner, t)) addStatus(c, r, e.status, n, !enemySide);
      break;
    }
    case 'rerolls': {
      const n = amt(e.amount);
      if (n === 0) break;
      if (e.when === 'now') f.rerollsLeft = Math.max(0, f.rerollsLeft + n);
      else f.nextTurnRerolls += n;
      c.ev.push({ type: 'rerollsChanged', amount: n, when: e.when });
      break;
    }
    case 'gold': addGold(c, amt(e.amount), true); break;
    case 'dieBonus': {
      const n = amt(e.amount);
      for (const i of selectDice(c, e.dice, owner, t)) f.dice[i]!.bonus += n;
      break;
    }
    case 'dieMultiply':
      for (const i of selectDice(c, e.dice, owner, t)) f.dice[i]!.multiplier *= e.factor;
      break;
    case 'dieRepeat':
      for (const i of selectDice(c, e.dice, owner, t)) f.dice[i]!.repeats += e.times;
      break;
    case 'curseFace':
      for (const r of select(c, e.target, owner, t)) {
        if (r.side === 'hero') trick(c, 'curseFace', r.index, pickCurseFace(c, r.index, e.face, true), 0);
      }
      break;
    case 'summon': summon(c, e.enemy, e.count); break;
    case 'revive': {
      if (!owner || !('hero' in owner)) break;
      const h = c.run.heroes[owner.hero]!;
      if (!h.downed) break;
      h.downed = false;
      h.hp = Math.max(1, Math.min(h.maxHp, Math.floor((h.maxHp * e.pct) / 100)));
      c.mods = null;
      c.ev.push({ type: 'heroRevived', hero: owner.hero });
      break;
    }
  }
}

function runTrig(c: Ctx, tr: TrigRef, owner: Exclude<Owner, null>, t: TCtx): void {
  const te = tr.te;
  const f = c.run.fight!;
  let store: Record<string, number> | null = null;
  let key = '';
  if (te.limit) {
    key = 'enemy' in owner ? `e${owner.enemy.uid}:${tr.key}` : `${tr.key}@${owner.hero}`;
    if (te.limit.per === 'run') store = c.run.limits;
    else {
      store = f.limits;
      if (te.limit.per === 'turn') key = `t:${key}`;
    }
    if ((store[key] ?? 0) >= te.limit.count) return;
  }
  if (te.condition && !cond(c, te.condition, owner, t)) return;
  if (store) store[key] = (store[key] ?? 0) + 1;
  if ('enemy' in owner) c.ev.push({ type: 'passiveTriggered', uid: owner.enemy.uid });
  else c.ev.push({ type: 'itemTriggered', item: owner.item, hero: owner.hero });
  for (const e of te.effects) applyEffect(c, e, owner, t, 1);
}

/** Fires a trigger: items first (heroes front to back), then enemy passives (front to back). */
export function fire(c: Ctx, trig: Trigger, t: TCtx): void {
  if (c.over || c.depth >= MAX_TRIGGER_DEPTH) return;
  const run = c.run;
  const f = run.fight!;
  c.depth++;
  if (c.db.itemTrigUsed.has(trig)) {
    for (let hi = 0; hi < run.heroes.length; hi++) {
      const h = run.heroes[hi]!;
      if (h.downed && trig !== 'heroDowned') continue;
      for (const id of h.items.slice()) {
        const trs = c.db.itemTrigs.get(id)?.[trig];
        if (trs) for (const tr of trs) runTrig(c, tr, { item: id, hero: hi }, t);
      }
    }
  }
  if (f.enemies.length > 0) {
    const tier = run.tier;
    let list: EnemyState[] | null = null;
    for (const e of f.enemies) {
      const def = c.db.enemies.get(e.enemyId)!;
      if (c.db.passives(def, tier)[trig]) {
        list = f.enemies.slice();
        break;
      }
    }
    if (list) {
      for (const e of list) {
        if (c.over) break;
        if (e.hp <= 0 && e !== t.subjE) continue;
        const trs = c.db.passives(c.db.enemies.get(e.enemyId)!, tier)[trig];
        if (trs) for (const tr of trs) runTrig(c, tr, { enemy: e }, t);
      }
    }
  }
  c.depth--;
}

// ---------------------------------------------------------------- tricks and summons

function immuneItem(c: Ctx, kind: TrickKind, hero: number): ItemId | null {
  const heroes = c.run.heroes;
  for (let i = 0; i < heroes.length; i++) {
    const h = heroes[i]!;
    if (h.downed) continue;
    for (const id of h.items) {
      const ms = c.db.itemMods.get(id);
      if (!ms) continue;
      for (const m of ms) {
        if (m.type === 'trickImmune' && m.tricks.includes(kind) && (m.scope === 'party' || kind === 'stealReroll' || i === hero)) return id;
      }
    }
  }
  return null;
}

/** An enemy dice trick lands on a hero (or is blocked by an item). `hero` is -1 for stealReroll. */
function trick(c: Ctx, kind: TrickKind, hero: number, face: number, amount: number): void {
  const f = c.run.fight!;
  if (kind === 'curseFace' && (face < 0 || f.heroes[hero]!.cursed.includes(face))) return;
  if (kind === 'lockDie' && f.nextTurnJams.includes(hero)) return;
  const blockedBy = immuneItem(c, kind, hero);
  c.ev.push({ type: 'trick', kind, hero, face: kind === 'curseFace' ? face : null, blockedBy });
  if (blockedBy) return;
  bump(c, 'tricksSuffered', 1);
  if (kind === 'lockDie') f.nextTurnJams.push(hero);
  else if (kind === 'curseFace') f.heroes[hero]!.cursed.push(face);
  else {
    f.nextTurnRerolls -= amount;
    c.stolen += amount;
    c.ev.push({ type: 'rerollsChanged', amount: -amount, when: 'nextTurn' });
  }
}

/** Which face a curse would hit. `live` = the dice on the table are current (so 'showing' can be read). */
function pickCurseFace(c: Ctx, hi: number, rule: CurseFaceRule, live: boolean): number {
  const run = c.run;
  const f = run.fight!;
  const hero = run.heroes[hi]!;
  const hf = f.heroes[hi]!;
  if (rule === 'showing') {
    if (!live) return -1;
    const d = f.dice.find((x) => x.hero === hi);
    return d ? d.face : -1;
  }
  const pending: number[] = [];
  for (const e of f.enemies) {
    if (!e.intent) continue;
    for (const a of e.intent.actions) {
      if (a.type !== 'curseFace') continue;
      const k = a.heroes.indexOf(hi);
      if (k >= 0 && a.faces[k] !== undefined) pending.push(a.faces[k]!);
    }
  }
  let cands: number[] = [];
  for (let i = 0; i < hero.faces.length; i++) if (hero.faces[i]!.effect !== 'blank' && !hf.cursed.includes(i)) cands.push(i);
  const fresh = cands.filter((i) => !pending.includes(i));
  if (fresh.length) cands = fresh;
  if (!cands.length) return -1;
  if (rule === 'random') return cands[nextInt(run, aiStream(run), cands.length)]!;
  let best = cands[0]!;
  const val = (i: number): number => hero.faces[i]!.value + (hf.growth[i] ?? 0);
  for (const i of cands) if (val(i) > val(best)) best = i;
  return best;
}

function createEnemy(c: Ctx, id: EnemyId, summoned: boolean): EnemyState | null {
  const def = c.db.enemies.get(id);
  if (!def) return null;
  const f = c.run.fight!;
  const tier = c.db.tier(c.run.tier);
  const hp = Math.max(1, Math.floor((def.hp * (100 + tier.hpPct)) / 100));
  const statuses: Statuses = { ...(def.startStatuses ?? {}) };
  for (const [s, n] of tier.statuses) statuses[s] = (statuses[s] ?? 0) + n;
  const e: EnemyState = {
    uid: f.nextEnemyUid++, enemyId: id, hp, maxHp: hp, shield: (def.startShield ?? 0) + tier.startShield, statuses,
    intent: null, cursor: 0, lastMoveId: null, summoned,
  };
  f.enemies.push(e);
  seen(c, 'enemies', id);
  return e;
}

function summon(c: Ctx, id: EnemyId, count: number): void {
  const f = c.run.fight!;
  for (let i = 0; i < count; i++) {
    if (f.enemies.length >= c.db.rules.maxEnemies) return;
    const e = createEnemy(c, id, true);
    if (!e) return;
    c.ev.push({ type: 'summoned', uid: e.uid, enemyId: id });
    if (!c.enemyPhase) pickIntent(c, e);
  }
}

// ---------------------------------------------------------------- enemy intents

function heroTargets(c: Ctx, rule: HeroTargetRule): number[] {
  const l = livingHeroes(c);
  if (!l.length) return [];
  const hs = c.run.heroes;
  switch (rule) {
    case 'front': return [l[0]!];
    case 'back': return [l[l.length - 1]!];
    case 'lowestHp': return [minBy(l, (i) => hs[i]!.hp)];
    case 'highestHp': return [minBy(l, (i) => -hs[i]!.hp)];
    case 'random': return [l[nextInt(c.run, aiStream(c.run), l.length)]!];
    case 'all': return l;
    default: return [];
  }
}

function enemyTargets(c: Ctx, self: EnemyState, rule: EnemyTargetRule): number[] {
  const live = c.run.fight!.enemies.filter((e) => e.hp > 0);
  switch (rule) {
    case 'self': return [self.uid];
    case 'allAllies': return live.map((e) => e.uid);
    case 'otherAllies': return live.filter((e) => e !== self).map((e) => e.uid);
    case 'lowestHpAlly': {
      let best: EnemyState | null = null;
      for (const e of live) if (!best || e.hp < best.hp) best = e;
      return best ? [best.uid] : [];
    }
    default: return [];
  }
}

/** Strength the Fury rule will still add before the enemy next acts (so shown intents already include it). */
function furyPending(c: Ctx): number {
  const fury = c.db.rules.fury;
  if (!fury || fury.strengthPerTurn <= 0 || c.fury === 1) return 0;
  const turn = c.run.fight!.turn;
  const actTurn = c.fury === 2 ? turn + 1 : Math.max(1, turn);
  return actTurn >= fury.fromTurn ? fury.strengthPerTurn : 0;
}

function attackAmount(c: Ctx, e: EnemyState, base: number): number {
  return Math.max(0, base + c.db.tier(c.run.tier).attack + (e.statuses.strength ?? 0) + furyPending(c));
}

function resolveAction(c: Ctx, e: EnemyState, a: EnemyAction): ResolvedEnemyAction {
  const ra: ResolvedEnemyAction = { type: a.type, amount: 0, hits: 0, pierce: false, poison: 0, status: null, heroes: [], enemies: [], faces: [], summon: null };
  switch (a.type) {
    case 'attack':
      ra.amount = attackAmount(c, e, a.amount);
      ra.hits = a.hits ?? 1;
      ra.pierce = !!a.pierce;
      ra.poison = a.poison ?? 0;
      ra.heroes = heroTargets(c, a.target);
      break;
    case 'shield':
    case 'heal':
      ra.amount = a.amount;
      ra.enemies = enemyTargets(c, e, a.target);
      break;
    case 'status':
      ra.status = a.status;
      ra.amount = a.amount;
      if (a.side === 'hero') ra.heroes = heroTargets(c, a.target as HeroTargetRule);
      else ra.enemies = enemyTargets(c, e, a.target as EnemyTargetRule);
      break;
    case 'lockDie':
      ra.heroes = heroTargets(c, a.target);
      break;
    case 'curseFace':
      ra.heroes = heroTargets(c, a.target);
      ra.faces = ra.heroes.map((h) => pickCurseFace(c, h, a.face, false));
      break;
    case 'stealReroll':
      ra.amount = a.amount;
      break;
    case 'summon':
      ra.summon = a.enemy;
      ra.amount = a.count;
      break;
    case 'charge':
      break;
  }
  return ra;
}

/** Chooses the enemy's next move and resolves its targets and amounts. */
export function pickIntent(c: Ctx, e: EnemyState): void {
  const def = c.db.enemies.get(e.enemyId)!;
  const pi = phaseIdx(def, e.hp, e.maxHp);
  const ai = pi < 0 ? def.ai : def.phases![pi]!.ai;
  let moveId: string | undefined;
  if (ai.type === 'cycle') {
    if (ai.order.length) {
      moveId = ai.order[e.cursor % ai.order.length];
      e.cursor++;
    }
  } else {
    let ids = Object.keys(ai.weights).filter((id) => (ai.weights[id] ?? 0) > 0);
    if (ai.noRepeat && ids.length > 1) ids = ids.filter((id) => id !== e.lastMoveId);
    let total = 0;
    for (const id of ids) total += ai.weights[id]!;
    if (total > 0) {
      let r = nextInt(c.run, aiStream(c.run), total);
      for (const id of ids) {
        r -= ai.weights[id]!;
        if (r < 0) { moveId = id; break; }
      }
    }
  }
  const move = def.moves.find((m) => m.id === moveId) ?? def.moves[0];
  e.intent = null;
  if (!move) {
    e.intent = { moveId: '', moveName: '', actions: [] };
    return;
  }
  e.lastMoveId = move.id;
  e.intent = { moveId: move.id, moveName: move.name, actions: move.actions.map((a) => resolveAction(c, e, a)) };
}

function defAction(c: Ctx, e: EnemyState, intent: Intent, i: number): EnemyAction | undefined {
  return c.db.enemies.get(e.enemyId)!.moves.find((m) => m.id === intent.moveId)?.actions[i];
}

/** Keeps the shown attack numbers in step with the enemy's strength. */
function refreshAttackAmounts(c: Ctx, e: EnemyState): void {
  const intent = e.intent;
  if (!intent) return;
  let changed = false;
  const actions = intent.actions.map((ra, i) => {
    if (ra.type !== 'attack') return ra;
    const a = defAction(c, e, intent, i);
    if (!a || a.type !== 'attack') return ra;
    const amount = attackAmount(c, e, a.amount);
    if (amount === ra.amount) return ra;
    changed = true;
    return { ...ra, amount };
  });
  if (changed) e.intent = { ...intent, actions };
}

/** 'showing' curses always point at the face the die shows right now. */
function refreshShowingCurses(c: Ctx): void {
  const f = c.run.fight!;
  for (const e of f.enemies) {
    const intent = e.intent;
    if (!intent) continue;
    let changed = false;
    const actions = intent.actions.map((ra, i) => {
      if (ra.type !== 'curseFace') return ra;
      const a = defAction(c, e, intent, i);
      if (!a || a.type !== 'curseFace' || a.face !== 'showing') return ra;
      changed = true;
      return { ...ra, faces: ra.heroes.map((h) => pickCurseFace(c, h, 'showing', true)) };
    });
    if (changed) e.intent = { ...intent, actions };
  }
}

/** Hero targets of an action at the moment the enemy acts (single targets fall back to the front hero). */
function heroesNow(c: Ctx, ra: ResolvedEnemyAction, rule: string | undefined): { heroes: number[]; retargeted: boolean } {
  const hs = c.run.heroes;
  const single = rule !== undefined ? rule !== 'all' : ra.heroes.length <= 1;
  if (!single) return { heroes: ra.heroes.filter((i) => !hs[i]!.downed), retargeted: false };
  const first = ra.heroes[0];
  if (first === undefined) return { heroes: [], retargeted: false };
  if (!hs[first]!.downed) return { heroes: [first], retargeted: false };
  const l = livingHeroes(c);
  return { heroes: l.length ? [l[0]!] : [], retargeted: true };
}

function enemyAct(c: Ctx, e: EnemyState): void {
  const intent = e.intent;
  if (!intent) return;
  const run = c.run;
  const f = run.fight!;
  c.ev.push({ type: 'enemyActs', uid: e.uid, moveId: intent.moveId });
  const self = enemyRef(e);
  for (let i = 0; i < intent.actions.length; i++) {
    if (c.over || e.hp <= 0) return;
    const ra = intent.actions[i]!;
    const a = defAction(c, e, intent, i);
    switch (ra.type) {
      case 'attack': {
        const base = a && a.type === 'attack' ? attackAmount(c, e, a.amount) : ra.amount;
        const amount = Math.max(0, base - (e.statuses.weak ?? 0));
        const { heroes } = heroesNow(c, ra, a && a.type === 'attack' ? a.target : undefined);
        for (const hi of heroes) {
          for (let k = 0; k < ra.hits; k++) {
            if (c.over || e.hp <= 0 || run.heroes[hi]!.downed) break;
            dmgHero(c, hi, amount, { cause: 'attack', source: self, pierce: ra.pierce, thorns: true });
          }
          if (ra.poison > 0 && !c.over) addStatus(c, heroRef(hi), 'poison', ra.poison, false);
        }
        break;
      }
      case 'shield':
        for (const uid of ra.enemies) giveShield(c, { side: 'enemy', uid }, ra.amount, false);
        break;
      case 'heal':
        for (const uid of ra.enemies) {
          const t = findEnemy(f, uid);
          if (t) healEnemy(c, t, ra.amount);
        }
        break;
      case 'status': {
        if (!ra.status) break;
        for (const uid of ra.enemies) addStatus(c, { side: 'enemy', uid }, ra.status, ra.amount, false);
        if (ra.heroes.length) {
          const rule = a && a.type === 'status' ? a.target : undefined;
          for (const hi of heroesNow(c, ra, rule).heroes) addStatus(c, heroRef(hi), ra.status, ra.amount, false);
        }
        break;
      }
      case 'lockDie':
        for (const hi of heroesNow(c, ra, a && a.type === 'lockDie' ? a.target : undefined).heroes) trick(c, 'lockDie', hi, -1, 0);
        break;
      case 'curseFace': {
        const rule = a && a.type === 'curseFace' ? a : undefined;
        const now = heroesNow(c, ra, rule?.target);
        for (const hi of now.heroes) {
          let face: number;
          if (rule?.face === 'showing') face = pickCurseFace(c, hi, 'showing', true);
          else if (now.retargeted) face = pickCurseFace(c, hi, 'highest', true);
          else face = ra.faces[ra.heroes.indexOf(hi)] ?? -1;
          trick(c, 'curseFace', hi, face, 0);
        }
        break;
      }
      case 'stealReroll':
        if (ra.amount > 0) trick(c, 'stealReroll', -1, -1, ra.amount);
        break;
      case 'summon':
        if (ra.summon) summon(c, ra.summon, ra.amount);
        break;
      case 'charge':
        break;
    }
  }
}

function tickDown(st: Statuses, s: StatusId): void {
  const n = (st[s] ?? 0) - 1;
  if (n > 0) st[s] = n;
  else delete st[s];
}

/** Steps 1 to 4 of the enemy phase (design.md section 4). Stops early if the fight ends. */
function enemyPhase(c: Ctx): void {
  const run = c.run;
  const f = run.fight!;
  c.enemyPhase = true;
  c.phaseShield = {};
  for (const e of f.enemies.slice()) {
    if (c.over) break;
    if (e.hp <= 0) continue;
    const p = e.statuses.poison ?? 0;
    if (p > 0) {
      dmgEnemy(c, e, p, { cause: 'poison', source: null, raw: true });
      if (e.hp > 0) tickDown(e.statuses, 'poison');
    }
    const r = e.hp > 0 ? (e.statuses.regen ?? 0) : 0;
    if (r > 0) {
      healEnemy(c, e, r);
      tickDown(e.statuses, 'regen');
    }
  }
  // Fury: from the configured turn on, every living enemy gains Strength before anyone acts.
  const fury = c.db.rules.fury;
  c.fury = 1;
  if (!c.over && fury && fury.strengthPerTurn > 0 && f.turn >= fury.fromTurn) {
    for (const e of f.enemies) if (e.hp > 0) addStatus(c, enemyRef(e), 'strength', fury.strengthPerTurn, false);
  }
  for (const e of f.enemies.slice()) {
    if (c.over) break;
    if (e.hp <= 0 || !e.intent || !f.enemies.includes(e)) continue;
    e.shield = Math.min(e.shield, c.phaseShield[e.uid] ?? 0);
    enemyAct(c, e);
  }
  if (!c.over) {
    for (let hi = 0; hi < run.heroes.length; hi++) {
      if (c.over) break;
      if (run.heroes[hi]!.downed) continue;
      const hf = f.heroes[hi]!;
      const p = hf.statuses.poison ?? 0;
      if (p > 0) {
        dmgHero(c, hi, p, { cause: 'poison', source: null, raw: true });
        if (!run.heroes[hi]!.downed) tickDown(hf.statuses, 'poison');
      }
    }
  }
  if (!c.over) {
    for (const hf of f.heroes) delete hf.statuses.mark;
    for (const e of f.enemies) {
      delete e.statuses.mark;
      delete e.statuses.weak;
    }
    fire(c, 'enemyPhaseEnd', {});
  }
  if (!c.over) {
    c.fury = 2;
    for (const e of f.enemies) e.intent = null;
    for (const e of f.enemies) pickIntent(c, e);
    c.ev.push({ type: 'intentsSet' });
  }
  c.fury = 0;
  c.enemyPhase = false;
  c.phaseShield = null;
}

// ---------------------------------------------------------------- turn flow

/** Starts a fight against an encounter and runs it up to the first roll. */
export function beginFight(c: Ctx, enc: EncounterDef, kind: FightState['kind']): void {
  const run = c.run;
  const retPct = c.db.rules.downedReturnHpPct + sumAllMods(c, 'returnHpPct');
  for (const h of run.heroes) {
    if (h.downed) {
      h.downed = false;
      h.hp = Math.max(1, Math.min(h.maxHp, Math.floor((h.maxHp * retPct) / 100)));
    }
  }
  run.stats.fight = {};
  run.stats.turn = {};
  run.fight = {
    encounterId: enc.id, kind, turn: 0, phase: 'rolling', rerollsLeft: 0, rerollsSpent: 0, nextTurnRerolls: 0, nextTurnJams: [],
    dice: [],
    heroes: run.heroes.map((h) => ({ shield: 0, ward: 0, statuses: {}, growth: h.faces.map(() => 0), cursed: [] })),
    enemies: [], sets: [], nextEnemyUid: 1, diceUsed: 0, limits: {}, undo: [],
  };
  run.phase = 'fight';
  c.mods = null;
  c.over = 0;
  c.dying = [];
  for (const id of enc.enemies) {
    if (run.fight.enemies.length >= c.db.rules.maxEnemies) break;
    createEnemy(c, id, false);
  }
  c.ev.push({ type: 'phase', phase: 'fight' });
  c.ev.push({ type: 'fightStart', encounterId: enc.id });
  if (run.fight.enemies.length === 0) {
    c.over = 1;
    return;
  }
  for (const { m, h } of activeMods(c)) if (m.type === 'startStatus') addStatus(c, heroRef(h), m.status, m.amount, false);
  fire(c, 'fightStart', {});
  if (c.over) return;
  for (const e of run.fight.enemies) if (!e.intent) pickIntent(c, e);
  c.ev.push({ type: 'intentsSet' });
  startTurn(c);
}

export function startTurn(c: Ctx): void {
  if (c.over) return;
  const run = c.run;
  const f = run.fight!;
  const mods = activeMods(c);
  f.turn++;
  for (let hi = 0; hi < run.heroes.length; hi++) {
    if (run.heroes[hi]!.downed) continue;
    const hf = f.heroes[hi]!;
    if (f.turn > 1 && hf.shield > 0) {
      let persists = false;
      for (const { m, h } of mods) if (m.type === 'shieldPersists' && (m.scope === 'party' || h === hi)) persists = true;
      if (!persists) hf.shield = 0;
    }
    const r = hf.statuses.regen ?? 0;
    if (r > 0) {
      healHero(c, hi, r);
      tickDown(hf.statuses, 'regen');
    }
  }
  const tier = c.db.tier(run.tier);
  let rr = c.db.rules.rerollsPerTurn + tier.rerolls + (f.turn === 1 ? tier.rerollsFirstTurn : 0) + f.nextTurnRerolls;
  for (const { m } of mods) if (m.type === 'rerolls' && (!m.firstTurnOnly || f.turn === 1)) rr += m.amount;
  f.rerollsLeft = Math.max(0, rr);
  f.rerollsSpent = 0;
  f.nextTurnRerolls = 0;
  const stream = diceStream(run);
  const rolled: { die: number; face: number }[] = [];
  f.dice = [];
  for (let hi = 0; hi < run.heroes.length; hi++) {
    const h = run.heroes[hi]!;
    if (h.downed) continue;
    const face = nextInt(run, stream, h.faces.length);
    rolled.push({ die: f.dice.length, face });
    f.dice.push({ hero: hi, face, locked: false, jammed: f.nextTurnJams.includes(hi), used: false, rerolled: false, firstLocked: false, bonus: 0, multiplier: 1, repeats: 0 });
  }
  f.nextTurnJams = [];
  f.sets = [];
  f.diceUsed = 0;
  f.undo = [];
  f.phase = 'rolling';
  for (const k in f.limits) if (k.charCodeAt(0) === 116 && k.charCodeAt(1) === 58) delete f.limits[k];
  run.stats.turn = {};
  bump(c, 'turnsTaken', 1);
  c.ev.push({ type: 'turnStart', turn: f.turn });
  c.ev.push({ type: 'diceRolled', dice: rolled, reroll: false });
  refreshShowingCurses(c);
  fire(c, 'turnStart', {});
}

export function toggleLock(c: Ctx, di: number): void {
  const f = c.run.fight!;
  const d = f.dice[di]!;
  d.locked = !d.locked;
  c.ev.push({ type: 'lockToggled', die: di, locked: d.locked });
  if (!d.locked) return;
  if (!f.dice.some((x) => x.firstLocked)) d.firstLocked = true;
  const key = `t:lock${di}`;
  if (!f.limits[key]) {
    f.limits[key] = 1;
    fire(c, 'dieLocked', { die: di, source: heroRef(d.hero) });
  }
}

/** Dice a reroll would touch, and whether it would be free (freeSingleReroll items). */
export function rerollInfo(c: Ctx): { dice: number[]; free: boolean } {
  const f = c.run.fight!;
  const dice: number[] = [];
  for (let i = 0; i < f.dice.length; i++) {
    const d = f.dice[i]!;
    if (!d.locked && !d.jammed && !d.used && !c.run.heroes[d.hero]!.downed) dice.push(i);
  }
  let free = false;
  if (dice.length === 1) {
    let count = 0;
    for (const { m } of activeMods(c)) if (m.type === 'freeSingleReroll') count += m.count;
    free = (f.limits['t:free'] ?? 0) < count;
  }
  return { dice, free };
}

export function reroll(c: Ctx): void {
  const run = c.run;
  const f = run.fight!;
  const { dice, free } = rerollInfo(c);
  if (free) f.limits['t:free'] = (f.limits['t:free'] ?? 0) + 1;
  else {
    f.rerollsLeft--;
    f.rerollsSpent++;
    bump(c, 'rerollsSpent', 1);
  }
  const stream = diceStream(run);
  const rolled: { die: number; face: number }[] = [];
  for (const i of dice) {
    const d = f.dice[i]!;
    d.face = nextInt(run, stream, run.heroes[d.hero]!.faces.length);
    d.rerolled = true;
    rolled.push({ die: i, face: d.face });
  }
  c.ev.push({ type: 'diceRolled', dice: rolled, reroll: true });
  refreshShowingCurses(c);
  for (const i of dice) fire(c, 'dieRerolled', { die: i, source: heroRef(f.dice[i]!.hero) });
}

/** Rolling ends: sets form, their bonuses and bursts apply, then rollEnd / setFormed triggers. */
export function endRolling(c: Ctx): void {
  const f = c.run.fight!;
  f.phase = 'acting';
  const found = detectSets(c);
  f.sets = found.map((x) => x.set);
  if (!found.length) {
    fire(c, 'rollEnd', {});
    return;
  }
  const mods = activeMods(c);
  for (const { set, def } of found) {
    let bonus = def.dieBonus;
    for (const { m } of mods) if (m.type === 'setBonus' && (m.kind === undefined || m.kind === set.kind)) bonus += m.amount;
    for (const di of set.dice) f.dice[di]!.bonus += bonus;
    bump(c, set.kind === 'pair' ? 'pairsFormed' : set.kind === 'triple' ? 'triplesFormed' : 'rainbowsFormed', 1);
  }
  c.ev.push({ type: 'setsFormed', sets: f.sets });
  for (const { set, def } of found) {
    if (!def.burst) continue;
    let mult = 1;
    if (set.kind === 'triple') for (const { m } of mods) if (m.type === 'tripleBurstMultiplier') mult *= m.factor;
    for (const e of def.burst) applyEffect(c, e, null, { set }, mult);
  }
  fire(c, 'rollEnd', {});
  for (const set of f.sets) fire(c, 'setFormed', { set });
}

function resolvePart(c: Ctx, hero: number, p: Part, target: TargetRef | undefined): void {
  const f = c.run.fight!;
  const user = heroRef(hero);
  const cleave = p.keywords.includes('cleave');
  switch (p.effect) {
    case 'damage':
    case 'weaken': {
      let targets: EnemyState[];
      if (cleave) targets = f.enemies.slice();
      else {
        const e = (target && target.side === 'enemy' ? findEnemy(f, target.uid) : undefined) ?? f.enemies.find((x) => x.hp > 0);
        targets = e ? [e] : [];
      }
      const venom = p.keywords.includes('venom');
      const execute = p.keywords.includes('execute');
      const pierce = p.keywords.includes('pierce');
      for (const e of targets) {
        if (c.over) return;
        if (e.hp <= 0) continue;
        if (p.effect === 'weaken') addStatus(c, enemyRef(e), 'weak', p.value, true);
        else if (venom) {
          if (p.value > 0) addStatus(c, enemyRef(e), 'poison', p.value, true);
        } else {
          const dmg = execute && e.hp * 2 <= e.maxHp ? Math.floor(p.value * c.db.kw.execute) : p.value;
          dmgEnemy(c, e, dmg, { cause: 'die', source: user, pierce, thorns: true });
        }
      }
      break;
    }
    case 'shield':
    case 'heal': {
      const targets = cleave ? livingHeroes(c) : [target && target.side === 'hero' ? target.index : hero];
      for (const hi of targets) {
        if (p.effect === 'shield') giveShield(c, heroRef(hi), p.value, p.keywords.includes('ward'));
        else healHero(c, hi, p.value);
      }
      break;
    }
    case 'focus':
      if (p.value > 0) {
        f.nextTurnRerolls += p.value;
        c.ev.push({ type: 'rerollsChanged', amount: p.value, when: 'nextTurn' });
      }
      break;
    case 'blank':
      break;
  }
}

/** Uses a die (ending the rolling phase first if needed). The caller has checked legality. */
export function useDie(c: Ctx, di: number, target: TargetRef | undefined): void {
  const run = c.run;
  const f = run.fight!;
  if (f.phase === 'rolling') {
    endRolling(c);
    if (c.over) return;
  }
  const d = f.dice[di]!;
  const hero = run.heroes[d.hero]!;
  if (hero.downed) return;
  const eff = computeEff(c, di);
  const p0 = eff.parts[0]!;
  d.used = true;
  f.diceUsed++;
  bump(c, 'dicePlayed', 1);
  c.cur = { die: di, blank: eff.blank };
  c.ev.push({ type: 'dieUsed', die: di, hero: d.hero, target: target ?? null });
  const kw = c.db.kw;
  const reckless = p0.keywords.includes('reckless');
  const times = 1 + (p0.keywords.includes('twin') ? 1 : 0) + d.repeats;
  for (let t = 0; t < times && !c.over && !hero.downed; t++) {
    for (const p of eff.parts) {
      if (c.over || hero.downed) break;
      resolvePart(c, d.hero, p, target);
    }
    if (reckless && !c.over && !hero.downed) {
      dmgHero(c, d.hero, kw.reckless, { cause: 'reckless', source: null, raw: true, floor1: true });
    }
  }
  if (!c.over) {
    if (reckless) bump(c, 'recklessUses', 1);
    if (eff.echo) bump(c, 'echoUses', 1);
    if (p0.keywords.includes('growth')) {
      let step = kw.growth;
      for (const { m } of activeMods(c)) if (m.type === 'growthStep') step += m.amount;
      const hf = f.heroes[d.hero]!;
      hf.growth[d.face] = (hf.growth[d.face] ?? 0) + step;
      bump(c, 'growthGained', step);
    }
    if (p0.keywords.includes('rally')) {
      for (let i = 0; i < f.dice.length; i++) {
        const o = f.dice[i]!;
        if (i !== di && !o.used) o.bonus += kw.rally;
      }
    }
    fire(c, 'dieUsed', { die: di, eff, value: p0.value, subject: target ?? null, source: heroRef(d.hero) });
  }
  c.cur = null;
}

/** End Turn up to the end of the enemy phase (new intents chosen). Does not start the next turn. */
export function endTurnCore(c: Ctx): void {
  const f = c.run.fight!;
  if (f.phase === 'rolling') {
    endRolling(c);
    if (c.over) return;
  }
  if (!c.preview) checkFeats(c, 'turnEnd');
  fire(c, 'turnEnd', {});
  if (c.over) return;
  for (const hf of f.heroes) delete hf.statuses.weak;
  f.undo = [];
  enemyPhase(c);
}
