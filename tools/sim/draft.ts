/**
 * How the skilled bot values faces, upgrades and items between fights.
 * Everything is measured in one rough unit: "extra value per turn", so options can be compared.
 */
import type { ContentDB, FaceEffect, ItemDef, ItemId, KeywordId, Modifier, RunState, SymbolId } from '@shared';
import { matchesFilter } from './model';
import type { Strategy } from './strategies';

export interface FaceLike {
  effect: FaceEffect;
  value: number;
  keywords: KeywordId[];
  symbol: SymbolId | null;
}

export interface DraftCtx {
  content: ContentDB;
  strategy: Strategy | null;
  kw: Record<KeywordId, number>;
}

export interface HeldMod {
  m: Modifier;
  h: number;
}

export function makeDraftCtx(content: ContentDB, strategy: Strategy | null): DraftCtx {
  const kw = {} as Record<KeywordId, number>;
  for (const k of content.keywords) kw[k.id] = k.param;
  return { content, strategy, kw };
}

export function runMods(content: ContentDB, run: RunState): HeldMod[] {
  const out: HeldMod[] = [];
  run.heroes.forEach((hero, h) => {
    for (const id of hero.items) for (const m of content.items.find((i) => i.id === id)?.modifiers ?? []) out.push({ m, h });
  });
  return out;
}

const poisonTotal = (p: number): number => (p * (p + 1)) / 2;

function scorePart(dc: DraftCtx, effect: FaceEffect, value: number, kws: KeywordId[], mods: HeldMod[]): number {
  let v = value;
  if (kws.includes('momentum')) v += 1.3 * dc.kw.momentum;
  if (kws.includes('poised')) v += 0.45 * dc.kw.poised;
  if (kws.includes('growth')) {
    let step = dc.kw.growth;
    for (const { m } of mods) if (m.type === 'growthStep') step += m.amount;
    v += 1.4 * step;
  }
  let s = 0;
  const twin = kws.includes('twin') ? 2 : 1;
  switch (effect) {
    case 'damage':
      if (kws.includes('venom')) {
        let p = v;
        for (const { m } of mods) if (m.type === 'statusPotency' && m.status === 'poison') p += m.amount;
        s = 0.85 * Math.min(poisonTotal(p), p * 2.4);
      } else {
        s = v;
        if (kws.includes('pierce')) s += 0.6;
        if (kws.includes('execute')) s *= 1 + 0.3 * (dc.kw.execute - 1);
      }
      if (kws.includes('cleave')) s *= 1.5;
      break;
    case 'shield':
      s = v * 0.9;
      for (const { m } of mods) if (m.type === 'shieldGain') s += 0.9 * m.amount;
      if (kws.includes('ward')) s *= 1.25;
      if (kws.includes('cleave')) s *= 2.1;
      break;
    case 'heal':
      s = v * 0.8;
      if (kws.includes('cleave')) s *= 2;
      break;
    case 'weaken':
      s = v * 0.8;
      if (kws.includes('cleave')) s *= 1.7;
      break;
    case 'focus':
      s = v * 0.9;
      break;
    case 'blank':
      return 0;
  }
  s *= twin;
  if (kws.includes('rally')) s += 1.7 * dc.kw.rally;
  if (kws.includes('reckless')) s -= 1.3 * dc.kw.reckless * twin;
  return s;
}

/** Draft value of one face on hero `h`, given the items the party holds. `echoBase` = typical value of the die Echo copies. */
export function faceScore(dc: DraftCtx, face: FaceLike, h: number, mods: HeldMod[], echoBase = 3.5): number {
  const st = dc.strategy;
  if (face.effect === 'blank') {
    let s = 0;
    for (const { m } of mods) if (m.type === 'blankAs') s += scorePart(dc, m.effect, m.value, m.cleave ? ['cleave'] : [], mods);
    // A blanks build counts on finding its items, so it treats blanks as worth something before it has them.
    return st?.keepBlanks ? Math.max(s, 1.5) : s;
  }
  const echo = face.keywords.includes('echo');
  const kws = face.keywords.slice();
  let value = face.value + (echo ? echoBase : 0);
  for (const { m, h: mh } of mods) {
    if (m.type === 'grantKeyword' && (m.scope === 'party' || mh === h) && !kws.includes(m.keyword) && matchesFilter(m.filter, face.effect, kws, face.symbol, false, echo)) kws.push(m.keyword);
  }
  for (const { m, h: mh } of mods) {
    if (m.type === 'faceValue' && (m.scope === 'party' || mh === h) && matchesFilter(m.filter, face.effect, kws, face.symbol, false, echo)) {
      value += m.amount * (m.hpAtMostPct !== undefined ? 0.2 : 1) * (m.noRerollsSpent ? 0.2 : 1);
    }
  }
  let s = scorePart(dc, face.effect, Math.max(0, value), kws, mods);
  if (st) {
    for (const k of face.keywords) s *= st.keywords?.[k] ?? 1;
    s *= st.effects?.[face.effect] ?? 1;
    if (face.symbol) s *= st.symbols?.[face.symbol] ?? 1;
  }
  return s;
}

const RANK_WEIGHT = [0.34, 0.26, 0.18, 0.12, 0.07, 0.03];

/** Value of a whole die: its best faces count most, because two rerolls usually find them. */
export function dieValue(scores: number[]): number {
  const s = scores.slice().sort((a, b) => b - a);
  let v = 0;
  for (let i = 0; i < s.length; i++) v += (RANK_WEIGHT[i] ?? 0.02) * s[i]!;
  return v;
}

/** Typical value of the die an Echo face on hero  would copy. */
export function echoBaseFor(run: RunState, h: number): number {
  let echoBase = 3.5;
  const left = h > 0 ? run.heroes[h - 1] : run.heroes[h + 1];
  if (left) {
    const vals = left.faces.filter((f) => f.effect !== 'blank' && !f.keywords.includes('echo')).map((f) => f.value).sort((a, b) => b - a);
    if (vals.length) echoBase = (vals[0]! + (vals[1] ?? vals[0]!) + (vals[2] ?? vals[0]!)) / 3;
  }
  return echoBase;
}

export function heroScores(dc: DraftCtx, run: RunState, h: number, mods: HeldMod[]): number[] {
  const echoBase = echoBaseFor(run, h);
  return run.heroes[h]!.faces.map((f) => faceScore(dc, f, h, mods, echoBase));
}

export function partyValue(dc: DraftCtx, run: RunState, mods: HeldMod[]): number {
  let v = 0;
  for (let h = 0; h < run.heroes.length; h++) v += dieValue(heroScores(dc, run, h, mods));
  return v;
}

/** Value of everything an item does that is not a change to face values (those are measured directly). */
function flatValue(dc: DraftCtx, run: RunState, item: ItemDef, owner: number): number {
  const count = (pred: (f: FaceLike) => boolean, who?: number): number => {
    let n = 0;
    run.heroes.forEach((x, i) => { if (who === undefined || who === i) for (const f of x.faces) if (pred(f)) n++; });
    return n;
  };
  let v = 0;
  for (const m of item.modifiers ?? []) {
    switch (m.type) {
      case 'maxHp': v += 0.04 * m.amount; break;
      case 'rerolls': v += m.firstTurnOnly ? 0.3 * m.amount : 0.6 * m.amount; break;
      case 'rerolledBonus': v += 0.45 * m.amount; break;
      case 'firstLockMultiplier': v += 3.4 * (m.factor - 1); break;
      case 'setBonus': v += m.kind === 'triple' ? 0.08 * m.amount : 0.3 * m.amount; break;
      case 'tripleBurstMultiplier': v += 0.15 * (m.factor - 1); break;
      case 'enableRainbow': v += 0.45; break;
      case 'wildSymbol': v += 1.5; break;
      case 'shieldPersists': v += 0.25 + 0.2 * count((f) => f.effect === 'shield', owner); break;
      case 'shieldGain': v += 0.12 * m.amount * count((f) => f.effect === 'shield'); break;
      case 'trickImmune': v += m.tricks.includes('lockDie') ? 0.15 : 0.25; break;
      case 'statusPotency': break; // measured through the venom faces themselves
      case 'growthStep': break; // measured through the growth faces themselves
      case 'startStatus': v += m.status === 'thorns' ? (owner === 0 ? 0.3 : 0.12) * m.amount : 0.2 * m.amount; break;
      case 'returnHpPct': v += 0.012 * m.amount; break;
      case 'healAfterFight': v += 0.2 * m.amount; break;
      case 'goldGainPct': v += 0.006 * m.amount; break;
      case 'shopDiscountPct': v += 0.01 * m.amount; break;
      case 'freeSingleReroll': v += 0.3 * m.count; break;
      default: break;
    }
  }
  for (const t of item.triggers ?? []) {
    for (const e of t.effects) {
      if (t.trigger === 'fightStart' && e.type === 'shield') v += 0.1 * (typeof e.amount === 'number' ? e.amount : 3);
      else if (t.trigger === 'turnEnd' && e.type === 'shield') v += 0.2;
      else if (t.trigger === 'dieUsed' && e.type === 'damage') v += 0.14 * (typeof e.amount === 'number' ? e.amount : 2) * count((f) => f.effect === 'shield', owner);
      else if (t.trigger === 'dieUsed' && e.type === 'heal') v += 0.1 * (typeof e.amount === 'number' ? e.amount : 1) * count((f) => f.effect === 'damage', owner);
      else if (t.trigger === 'rollEnd' && e.type === 'dieBonus' && !t.condition) v += 0.75 * (typeof e.amount === 'number' ? e.amount : 1);
      else if (t.trigger === 'dieUsed' && e.type === 'dieBonus' && typeof e.amount === 'number' && e.amount > 0) v += 0.55 * e.amount;
      else if (t.trigger === 'enemyKilled' && e.type === 'status') v += 0.3 * count((f) => f.keywords.includes('venom'));
      else if (t.trigger === 'setFormed' && e.type === 'dieRepeat') v += 0.5;
      else if (e.type === 'revive') v += 0.45;
    }
  }
  return v;
}

export interface ItemPlan {
  gain: number;
  hero: number;
  replaceItem?: number;
}

/** Value of `item` if hero `owner` held it, on top of what the party holds now (minus `without`, an item being replaced). */
export function itemValue(dc: DraftCtx, run: RunState, item: ItemDef, owner: number, mods: HeldMod[], base: number): number {
  const extra = (item.modifiers ?? []).map((m) => ({ m, h: owner }));
  const faceGain = extra.length ? partyValue(dc, run, [...mods, ...extra]) - base : 0;
  return (faceGain + flatValue(dc, run, item, owner)) * (dc.strategy?.items[item.id] ?? 1);
}

/** Best place for an item: a free slot, or the weakest held item if the swap is worth it. */
export function planItem(dc: DraftCtx, run: RunState, id: ItemId): ItemPlan | null {
  const item = dc.content.items.find((i) => i.id === id);
  if (!item) return null;
  const mods = runMods(dc.content, run);
  const base = partyValue(dc, run, mods);
  let best: ItemPlan | null = null;
  run.heroes.forEach((hero, h) => {
    const slots = dc.content.heroes.find((x) => x.id === hero.heroId)?.itemSlots ?? 2;
    const gain = itemValue(dc, run, item, h, mods, base);
    if (hero.items.length < slots) {
      if (!best || gain > best.gain) best = { gain, hero: h };
      return;
    }
    hero.items.forEach((oldId, k) => {
      const old = dc.content.items.find((i) => i.id === oldId);
      if (!old) return;
      // What the old item is worth where it is: the party's value with it minus without it.
      const without = runMods(dc.content, { ...run, heroes: run.heroes.map((x, i) => (i === h ? { ...x, items: x.items.filter((_, j) => j !== k) } : x)) });
      const baseWithout = partyValue(dc, run, without);
      const oldValue = itemValue(dc, run, old, h, without, baseWithout);
      const newValue = itemValue(dc, run, item, h, without, baseWithout);
      const net = newValue - oldValue;
      if (!best || net > best.gain) best = { gain: net, hero: h, replaceItem: k };
    });
  });
  return best;
}

export interface FacePlan {
  gain: number;
  face: number;
}

/** Best slot for a new face on hero `h` (replaces the face the die will miss least). */
export function planFace(dc: DraftCtx, run: RunState, h: number, face: FaceLike): FacePlan {
  const mods = runMods(dc.content, run);
  const scores = heroScores(dc, run, h, mods);
  const before = dieValue(scores);
  const fresh = faceScore(dc, face, h, mods, echoBaseFor(run, h));
  let best: FacePlan = { gain: -Infinity, face: 0 };
  // Never draft the party out of its ability to finish a fight: keep damage on every die and enough in the party.
  const isDamage = (f: FaceLike): boolean => f.effect === 'damage';
  const heroDamage = run.heroes[h]!.faces.filter(isDamage).length;
  const partyDamage = run.heroes.reduce((n, x) => n + x.faces.filter(isDamage).length, 0);
  for (let i = 0; i < scores.length; i++) {
    if (isDamage(run.heroes[h]!.faces[i]!) && !isDamage(face) && (heroDamage <= 1 || partyDamage <= 6)) continue;
    const next = scores.slice();
    next[i] = fresh;
    const gain = dieValue(next) - before;
    if (gain > best.gain) best = { gain, face: i };
  }
  return best;
}

/** Best face to upgrade on hero `h`. */
export function planUpgrade(dc: DraftCtx, run: RunState, h: number, amount: number): FacePlan | null {
  const mods = runMods(dc.content, run);
  const hero = run.heroes[h]!;
  const scores = heroScores(dc, run, h, mods);
  const before = dieValue(scores);
  const max = dc.content.rules.maxUpgradesPerFace;
  let best: FacePlan | null = null;
  hero.faces.forEach((f, i) => {
    if (f.effect === 'blank' || f.upgrades >= max) return;
    const next = scores.slice();
    next[i] = faceScore(dc, { ...f, value: f.value + amount }, h, mods, echoBaseFor(run, h));
    const gain = dieValue(next) - before;
    if (!best || gain > best.gain) best = { gain, face: i };
  });
  return best;
}
