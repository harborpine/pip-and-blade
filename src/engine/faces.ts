/** Effective die faces (the value pipeline of design.md section 5) and set detection (section 6). */
import type { ActiveSet, FaceEffect, FaceFilter, KeywordId, SetDef, SymbolId } from '@shared';
import { SYMBOLS } from '@shared';
import type { Ctx } from './ctx';
import { activeMods } from './ctx';

/** One thing a die does when used. Normal faces have one part; a blank with several blankAs items has several. */
export interface Part {
  effect: FaceEffect;
  value: number;
  keywords: KeywordId[];
}

export interface Eff {
  /** parts[0] is the primary part: it decides targeting and what the die view shows. */
  parts: Part[];
  /** Symbol for sets and filters (null for blank and cursed faces). */
  symbol: SymbolId | null;
  cursed: boolean;
  /** The face is a blank before blankAs items (includes cursed faces and failed Echoes). */
  blank: boolean;
  echo: boolean;
  echoOf: number | null;
}

interface FaceInfo {
  symbol: SymbolId | null;
  blank: boolean;
  echo: boolean;
}

export function matches(flt: FaceFilter | undefined, p: Part, e: FaceInfo): boolean {
  if (!flt) return true;
  if (flt.effect && !(flt.effect.includes(p.effect) || (e.blank && flt.effect.includes('blank')))) return false;
  if (flt.symbol && (e.symbol === null || !flt.symbol.includes(e.symbol))) return false;
  if (flt.keyword) {
    let ok = e.echo && flt.keyword.includes('echo');
    if (!ok) for (const k of p.keywords) if (flt.keyword.includes(k)) { ok = true; break; }
    if (!ok) return false;
  }
  return true;
}

export function partNeedsTarget(p: Part): boolean {
  return (p.effect === 'damage' || p.effect === 'weaken' || p.effect === 'shield' || p.effect === 'heal') && !p.keywords.includes('cleave');
}

/** The die Echo copies: the nearest living hero's die to the left, else the nearest to the right. */
function neighbour(c: Ctx, di: number): number | null {
  const f = c.run.fight!;
  const me = f.dice[di]!.hero;
  let left = -1;
  let right = -1;
  for (let i = 0; i < f.dice.length; i++) {
    const o = f.dice[i]!;
    if (i === di || c.run.heroes[o.hero]!.downed) continue;
    if (o.hero < me) left = i;
    else if (right < 0) right = i;
  }
  return left >= 0 ? left : right >= 0 ? right : null;
}

/** The face a die is showing with every rule applied: exactly what would resolve if it were used now. */
export function computeEff(c: Ctx, di: number): Eff {
  const run = c.run;
  const f = run.fight!;
  const d = f.dice[di]!;
  const hero = run.heroes[d.hero]!;
  const hf = f.heroes[d.hero]!;
  const face = hero.faces[d.face]!;
  const cursed = hf.cursed.includes(d.face);
  let effect: FaceEffect = cursed ? 'blank' : face.effect;
  let base = cursed ? 0 : face.value + (hf.growth[d.face] ?? 0);
  let kws: KeywordId[] = cursed ? [] : face.keywords;
  const symbol = cursed || face.effect === 'blank' ? null : face.symbol;
  const echo = !cursed && face.keywords.includes('echo');
  let echoOf: number | null = null;
  if (echo) {
    echoOf = neighbour(c, di);
    let copied = false;
    if (echoOf !== null) {
      const nd = f.dice[echoOf]!;
      const nface = run.heroes[nd.hero]!.faces[nd.face]!;
      const nhf = f.heroes[nd.hero]!;
      if (!nhf.cursed.includes(nd.face) && nface.effect !== 'blank' && !nface.keywords.includes('echo')) {
        effect = nface.effect;
        base += nface.value + (nhf.growth[nd.face] ?? 0);
        kws = nface.keywords;
        copied = true;
      }
    }
    if (!copied) {
      effect = 'blank';
      base = 0;
      kws = [];
    }
  }
  const blank = effect === 'blank';
  const mods = activeMods(c);
  let parts: Part[];
  if (blank) {
    parts = [];
    for (const { m } of mods) if (m.type === 'blankAs') parts.push({ effect: m.effect, value: m.value, keywords: m.cleave ? ['cleave'] : [] });
    if (parts.length === 0) return { parts: [{ effect: 'blank', value: 0, keywords: [] }], symbol, cursed, blank, echo, echoOf };
    const pi = parts.findIndex(partNeedsTarget);
    if (pi > 0) parts.unshift(parts.splice(pi, 1)[0]!);
  } else {
    parts = [{ effect, value: base, keywords: kws.slice() }];
  }
  const info: FaceInfo = { symbol, blank, echo };
  const kw = c.db.kw;
  const str = (hf.statuses.strength ?? 0) - (hf.statuses.weak ?? 0);
  for (const p of parts) {
    for (const { m, h } of mods) {
      if (m.type === 'grantKeyword' && (m.scope === 'party' || h === d.hero) && !p.keywords.includes(m.keyword) && matches(m.filter, p, info)) {
        p.keywords.push(m.keyword);
      }
    }
    let v = p.value;
    let lockMul = 1;
    for (const { m, h } of mods) {
      if (m.type === 'faceValue') {
        if ((m.scope === 'party' || h === d.hero) && matches(m.filter, p, info)
          && (m.hpAtMostPct === undefined || hero.hp * 100 <= m.hpAtMostPct * hero.maxHp)
          && (!m.noRerollsSpent || f.rerollsSpent === 0)) v += m.amount;
      } else if (m.type === 'rerolledBonus') {
        if (d.rerolled && (m.scope === 'party' || h === d.hero)) v += m.amount;
      } else if (m.type === 'firstLockMultiplier') {
        lockMul *= m.factor;
      }
    }
    if (p.effect === 'damage') v += str;
    if (p.keywords.includes('momentum')) v += kw.momentum * f.rerollsSpent;
    if (f.rerollsSpent === 0 && p.keywords.includes('poised')) v += kw.poised;
    v += d.bonus;
    if (d.firstLocked) v *= lockMul;
    v *= d.multiplier;
    p.value = Math.max(0, Math.floor(v));
  }
  return { parts, symbol, cursed, blank, echo, echoOf };
}

/** Number of living heroes' dice showing a blank (or cursed) face. */
export function blanksShowing(c: Ctx): number {
  const f = c.run.fight!;
  let n = 0;
  for (const d of f.dice) {
    const hero = c.run.heroes[d.hero]!;
    if (hero.downed) continue;
    if (hero.faces[d.face]!.effect === 'blank' || f.heroes[d.hero]!.cursed.includes(d.face)) n++;
  }
  return n;
}

const RANK: Record<ActiveSet['kind'], number> = { triple: 3, pair: 2, rainbow: 1 };

/** The set (at most one) the dice currently showing form. Pure: changes nothing. */
export function detectSets(c: Ctx): { set: ActiveSet; def: SetDef }[] {
  const run = c.run;
  const f = run.fight!;
  const mods = activeMods(c);
  const idx: number[] = [];
  const syms: (SymbolId | null)[] = [];
  const wild: boolean[] = [];
  for (let i = 0; i < f.dice.length; i++) {
    const d = f.dice[i]!;
    const hero = run.heroes[d.hero]!;
    if (hero.downed) continue;
    const face = hero.faces[d.face]!;
    const cursed = f.heroes[d.hero]!.cursed.includes(d.face);
    let w = false;
    for (const { m, h } of mods) if (m.type === 'wildSymbol' && h === d.hero) w = true;
    idx.push(i);
    syms.push(w || cursed || face.effect === 'blank' ? null : face.symbol);
    wild.push(w);
  }
  let best: { set: ActiveSet; def: SetDef } | null = null;
  let bestScore = -1;
  for (const s of SYMBOLS) {
    const members: number[] = [];
    for (let k = 0; k < idx.length; k++) if (wild[k] || syms[k] === s) members.push(idx[k]!);
    if (members.length < 2) continue;
    const kind = members.length >= 3 ? 'triple' : 'pair';
    const def = c.db.setDef(kind, s);
    if (!def) continue;
    const score = RANK[kind] * 10000 + def.dieBonus * 10 + (def.burst ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = { set: { kind, symbol: s, dice: members }, def };
    }
  }
  if (!best && idx.length >= 3) {
    let rainbow = false;
    for (const { m } of mods) if (m.type === 'enableRainbow') rainbow = true;
    const def = rainbow ? c.db.setDef('rainbow', null) : undefined;
    if (def) {
      const members: number[] = [];
      const used: SymbolId[] = [];
      for (let k = 0; k < idx.length; k++) {
        const s = syms[k];
        if (wild[k]) members.push(idx[k]!);
        else if (s !== null && s !== undefined && !used.includes(s)) {
          used.push(s);
          members.push(idx[k]!);
        }
      }
      if (members.length >= 3) {
        best = { set: { kind: 'rainbow', symbol: null, dice: members.sort((a, b) => a - b) }, def };
      }
    }
  }
  return best ? [best] : [];
}
