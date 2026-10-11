/**
 * The skilled bot's own picture of the dice, used only to decide what to lock and reroll.
 *
 * It never looks at the engine's future rolls. It reads the public state (faces, items, enemy
 * intents), estimates how useful every possible combination of showing faces would be, and then
 * works out the expected value of each lock choice by enumerating all outcomes (each face 1/6).
 * Using the dice afterwards is done with the engine's exact previews, not with this model.
 */
import type { ContentDB, FaceEffect, FaceFilter, GameState, KeywordId, Modifier, SetDef, SymbolId } from '@shared';
import { K } from './knobs';

interface Part {
  effect: FaceEffect;
  value: number;
  kws: KeywordId[];
}

interface Raw {
  effect: FaceEffect;
  base: number;
  kws: KeywordId[];
  symbol: SymbolId | null;
  blank: boolean;
  echo: boolean;
}

interface EnemyView {
  /** HP + shield, minus poison about to tick. */
  eff: number;
  hp: number;
  maxHp: number;
  shield: number;
  /** Total damage its shown intent would deal to the party. */
  threat: number;
  perHit: number;
  hits: number;
  trick: boolean;
  thorns: number;
}

export interface RollCtx {
  n: number;
  heroOf: number[];
  raw: Raw[][];
  mods: { m: Modifier; h: number }[];
  kw: Record<KeywordId, number>;
  neighbour: (number | null)[];
  wild: boolean[];
  enemies: EnemyView[];
  /** HP each living hero is forecast to lose this enemy phase if nothing more is done (by hero index). */
  incoming: number[];
  hp: number[];
  maxHp: number[];
  living: number[];
  sets: SetDef[];
  rainbow: boolean;
  tripleMult: number;
  tripleRepeat: boolean;
  glove: number;
  hpPct: number[];
  strength: number[];
  /** True if any face value depends on how many rerolls were spent. */
  spentMatters: boolean;
  /** Memo of computed face parts (they are never changed after being computed). */
  partsCache: Map<number, Part[]>;
  /** Memo of the value tables, by rerolls spent: the same for every roll decision of one turn. */
  tables: Float64Array[];
}

const BLANK_RAW: Raw = { effect: 'blank', base: 0, kws: [], symbol: null, blank: true, echo: false };

export function matchesFilter(flt: FaceFilter | undefined, effect: FaceEffect, kws: KeywordId[], symbol: SymbolId | null, blank: boolean, echo: boolean): boolean {
  if (!flt) return true;
  if (flt.effect && !(flt.effect.includes(effect) || (blank && flt.effect.includes('blank')))) return false;
  if (flt.symbol && (symbol === null || !flt.symbol.includes(symbol))) return false;
  if (flt.keyword) {
    let ok = echo && flt.keyword.includes('echo');
    if (!ok) for (const k of kws) if (flt.keyword.includes(k)) { ok = true; break; }
    if (!ok) return false;
  }
  return true;
}

/** Modifiers of every item held by a living hero, looked up in the content. */
export function heldMods(content: ContentDB, game: GameState): { m: Modifier; h: number }[] {
  const out: { m: Modifier; h: number }[] = [];
  const run = game.run!;
  run.heroes.forEach((hero, h) => {
    if (hero.downed) return;
    for (const id of hero.items) {
      const def = content.items.find((i) => i.id === id);
      for (const m of def?.modifiers ?? []) out.push({ m, h });
    }
  });
  return out;
}

export function buildRollCtx(content: ContentDB, game: GameState, incoming: number[]): RollCtx {
  const run = game.run!;
  const f = run.fight!;
  const mods = heldMods(content, game);
  const kw = {} as Record<KeywordId, number>;
  for (const k of content.keywords) kw[k.id] = k.param;
  const heroOf = f.dice.map((d) => d.hero);
  const raw: Raw[][] = f.dice.map((d) => {
    const hero = run.heroes[d.hero]!;
    const hf = f.heroes[d.hero]!;
    return hero.faces.map((face, i): Raw => {
      if (face.effect === 'blank' || hf.cursed.includes(i)) return BLANK_RAW;
      return { effect: face.effect, base: face.value + (hf.growth[i] ?? 0), kws: face.keywords, symbol: face.symbol, blank: false, echo: face.keywords.includes('echo') };
    });
  });
  const neighbour = f.dice.map((d, di) => {
    let left = -1;
    let right = -1;
    f.dice.forEach((o, i) => {
      if (i === di) return;
      if (o.hero < d.hero) left = i;
      else if (right < 0) right = i;
    });
    return left >= 0 ? left : right >= 0 ? right : null;
  });
  const enemies: EnemyView[] = f.enemies.filter((e) => e.hp > 0).map((e) => {
    let threat = 0;
    let perHit = 0;
    let hits = 0;
    let trick = false;
    for (const a of e.intent?.actions ?? []) {
      if (a.type === 'attack') {
        const amt = Math.max(0, a.amount - (e.statuses.weak ?? 0));
        threat += (amt * a.hits + a.poison) * a.heroes.length;
        perHit = Math.max(perHit, amt);
        hits += a.hits * a.heroes.length;
      } else if (a.type === 'lockDie' || a.type === 'curseFace' || a.type === 'stealReroll') trick = true;
    }
    const poison = e.statuses.poison ?? 0;
    return { eff: e.hp + e.shield - poison, hp: e.hp, maxHp: e.maxHp, shield: e.shield, threat, perHit, hits, trick, thorns: e.statuses.thorns ?? 0 };
  });
  const living: number[] = [];
  run.heroes.forEach((h, i) => { if (!h.downed) living.push(i); });
  let rainbow = false;
  let tripleMult = 1;
  let glove = 1;
  let spentMatters = false;
  for (const { m } of mods) {
    if (m.type === 'enableRainbow') rainbow = true;
    else if (m.type === 'tripleBurstMultiplier') tripleMult *= m.factor;
    else if (m.type === 'firstLockMultiplier') glove *= m.factor;
    else if (m.type === 'faceValue' && m.noRerollsSpent) spentMatters = true;
  }
  for (const faces of raw) for (const r of faces) if (r.kws.includes('momentum') || r.kws.includes('poised')) spentMatters = true;
  let tripleRepeat = false;
  for (const hero of run.heroes) {
    if (hero.downed) continue;
    for (const id of hero.items) {
      const def = content.items.find((i) => i.id === id);
      for (const t of def?.triggers ?? []) if (t.trigger === 'setFormed' && t.effects.some((e) => e.type === 'dieRepeat')) tripleRepeat = true;
    }
  }
  return {
    n: f.dice.length, heroOf, raw, mods, kw, neighbour,
    wild: f.dice.map((d) => mods.some((x) => x.m.type === 'wildSymbol' && x.h === d.hero)),
    enemies, incoming, hp: run.heroes.map((h) => h.hp), maxHp: run.heroes.map((h) => h.maxHp), living,
    sets: content.sets, rainbow, tripleMult, tripleRepeat, glove,
    hpPct: run.heroes.map((h) => (h.hp * 100) / h.maxHp),
    strength: f.heroes.map((h) => (h.statuses.strength ?? 0) - (h.statuses.weak ?? 0)),
    spentMatters,
    partsCache: new Map(),
    tables: [],
  };
}

/** What a face would do, with items and keywords applied (the engine's value pipeline, as the bot understands it). */
function partsOf(c: RollCtx, die: number, r: Raw, spent: number, bonus: number): Part[] {
  const h = c.heroOf[die]!;
  let parts: Part[];
  if (r.blank) {
    parts = [];
    for (const { m } of c.mods) if (m.type === 'blankAs') parts.push({ effect: m.effect, value: m.value, kws: m.cleave ? ['cleave'] : [] });
    if (!parts.length) return parts;
  } else parts = [{ effect: r.effect, value: r.base, kws: r.kws.slice() }];
  for (const p of parts) {
    for (const { m, h: mh } of c.mods) {
      if (m.type === 'grantKeyword' && (m.scope === 'party' || mh === h) && !p.kws.includes(m.keyword) && matchesFilter(m.filter, p.effect, p.kws, r.symbol, r.blank, r.echo)) p.kws.push(m.keyword);
    }
    let v = p.value;
    for (const { m, h: mh } of c.mods) {
      if (m.type === 'faceValue' && (m.scope === 'party' || mh === h) && matchesFilter(m.filter, p.effect, p.kws, r.symbol, r.blank, r.echo)
        && (m.hpAtMostPct === undefined || c.hpPct[h]! <= m.hpAtMostPct) && (!m.noRerollsSpent || spent === 0)) v += m.amount;
    }
    if (p.effect === 'damage') v += c.strength[h] ?? 0;
    if (p.kws.includes('momentum')) v += c.kw.momentum * spent;
    if (spent === 0 && p.kws.includes('poised')) v += c.kw.poised;
    p.value = Math.max(0, v + bonus);
  }
  return parts;
}

export interface SetHit {
  kind: 'pair' | 'triple' | 'rainbow';
  symbol: SymbolId | null;
  members: number[];
  def: SetDef;
}

const SYMS: SymbolId[] = ['blade', 'guard', 'heart', 'spark', 'skull'];

/** The set a list of showing symbols forms (null symbol = blank). Mirrors the rules in design.md section 6. */
export function findSet(symbols: (SymbolId | null)[], wild: boolean[], sets: SetDef[], rainbow: boolean): SetHit | null {
  const defFor = (kind: SetDef['kind'], s: SymbolId | null): SetDef | undefined =>
    (s ? sets.find((d) => d.kind === kind && d.symbol === s) : undefined) ?? sets.find((d) => d.kind === kind && d.symbol === undefined);
  let best: SetHit | null = null;
  let bestScore = -1;
  for (const s of SYMS) {
    const members: number[] = [];
    for (let i = 0; i < symbols.length; i++) if (wild[i] || symbols[i] === s) members.push(i);
    if (members.length < 2) continue;
    const kind = members.length >= 3 ? 'triple' : 'pair';
    const def = defFor(kind, s);
    if (!def) continue;
    const score = (kind === 'triple' ? 3 : 2) * 10000 + def.dieBonus * 10 + (def.burst ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = { kind, symbol: s, members, def };
    }
  }
  if (!best && rainbow && symbols.length >= 3) {
    const def = defFor('rainbow', null);
    const seen: SymbolId[] = [];
    const members: number[] = [];
    symbols.forEach((s, i) => {
      if (wild[i]) members.push(i);
      else if (s && !seen.includes(s)) { seen.push(s); members.push(i); }
    });
    if (def && members.length >= 3) best = { kind: 'rainbow', symbol: null, members, def };
  }
  return best;
}

const poisonTotal = (p: number): number => (p * (p + 1)) / 2;

/** Area damage against the working copy of the enemies; returns the damage that actually lands. */
function hitAll(en: EnemyView[], v: number, pierce: boolean): number {
  let u = 0;
  for (const e of en) {
    if (e.eff <= 0) continue;
    const room = pierce ? e.eff - e.shield : e.eff;
    u += Math.max(0, Math.min(v, room));
    e.eff -= v;
  }
  return u;
}

/** How good it would be to end rolling with these faces showing (bigger is better). */
export function utility(c: RollCtx, faces: number[], spent: number): number {
  const n = c.n;
  const raws: Raw[] = [];
  const copied: number[] = [];
  const symbols: (SymbolId | null)[] = [];
  for (let d = 0; d < n; d++) {
    let r = c.raw[d]![faces[d]!]!;
    symbols.push(c.wild[d] ? null : r.symbol);
    copied.push(-1);
    if (r.echo) {
      const nb = c.neighbour[d];
      if (nb !== null && nb !== undefined) copied[d] = faces[nb]!;
      const nr = nb === null || nb === undefined ? undefined : c.raw[nb]![faces[nb]!];
      r = !nr || nr.blank || nr.echo ? BLANK_RAW : { effect: nr.effect, base: r.base + nr.base, kws: nr.kws, symbol: r.symbol, blank: false, echo: true };
    }
    raws.push(r);
  }
  const set = findSet(symbols, c.wild, c.sets, c.rainbow);
  let u = 0;
  const en = c.enemies.map((e) => ({ ...e }));
  const inc = c.incoming.slice();
  let totalIncoming = 0;
  for (const h of c.living) totalIncoming += inc[h] ?? 0;
  let prevented = 0;
  let healed = 0;
  let blocked = 0;
  const missing = c.maxHp.map((m, i) => m - c.hp[i]!);

  if (set && set.kind === 'triple' && set.def.burst) {
    for (const b of set.def.burst) {
      const amt = 'amount' in b && typeof b.amount === 'number' ? b.amount * c.tripleMult : 0;
      if (b.type === 'damage') u += hitAll(en, amt, false);
      else if (b.type === 'shield') { for (const h of c.living) { const x = Math.min(amt, inc[h] ?? 0); blocked += x; inc[h] = (inc[h] ?? 0) - x; } }
      else if (b.type === 'heal') { for (const h of c.living) healed += Math.min(amt, missing[h] ?? 0); }
      else if (b.type === 'status') { if (b.status === 'poison') for (const e of en) if (e.eff > 0) u += 0.85 * Math.min(poisonTotal(amt), e.eff); }
      else if (b.type === 'rerolls') u += 0.7 * amt;
    }
  }
  let setBonus = 0;
  if (set) {
    setBonus = set.def.dieBonus;
    for (const { m } of c.mods) if (m.type === 'setBonus' && (m.kind === undefined || m.kind === set.kind)) setBonus += m.amount;
  }

  interface Use { p: Part; times: number; die: number }
  const uses: Use[] = [];
  let best = 0;
  for (let d = 0; d < n; d++) {
    const inSet = !!set && set.members.includes(d);
    const bonus = inSet ? setBonus : 0;
    const key = ((((d * 6 + faces[d]!) * 7 + copied[d]! + 1) * 8 + spent) * 32) + bonus;
    let parts = bonus >= 0 && bonus < 32 && spent < 8 ? c.partsCache.get(key) : undefined;
    if (!parts) {
      parts = partsOf(c, d, raws[d]!, spent, bonus);
      if (bonus >= 0 && bonus < 32 && spent < 8) c.partsCache.set(key, parts);
    }
    const p0 = parts[0];
    if (!p0) continue;
    const times = 1 + (p0.kws.includes('twin') ? 1 : 0) + (inSet && set!.kind === 'triple' && c.tripleRepeat ? 1 : 0);
    for (const p of parts) uses.push({ p, times, die: d });
    if (p0.kws.includes('rally')) u += c.kw.rally * (n - 1);
    if (p0.kws.includes('reckless')) u -= 0.6 * c.kw.reckless * times;
    if (p0.kws.includes('growth')) u += 0.5 * c.kw.growth;
    if (p0.value * times > best) best = p0.value * times;
  }
  if (c.glove > 1) u += best * (c.glove - 1) * 0.8;

  // Damage: area first, then single hits from the biggest down, each on the most worthwhile target.
  for (const x of uses) {
    if (x.p.effect !== 'damage' || !x.p.kws.includes('cleave')) continue;
    for (let t = 0; t < x.times; t++) {
      if (x.p.kws.includes('venom')) { for (const e of en) if (e.eff > 0) { u += 0.85 * Math.min(poisonTotal(x.p.value), e.eff); e.eff -= x.p.value; } }
      else u += hitAll(en, x.p.value, x.p.kws.includes('pierce'));
    }
  }
  const singles = uses.filter((x) => x.p.effect === 'damage' && !x.p.kws.includes('cleave')).sort((a, b) => b.p.value - a.p.value);
  for (const x of singles) {
    for (let t = 0; t < x.times; t++) {
      const venom = x.p.kws.includes('venom');
      let target: (typeof en)[number] | null = null;
      let bestScore = -Infinity;
      for (const e of en) {
        if (e.eff <= 0) continue;
        let v = x.p.value;
        if (x.p.kws.includes('execute') && e.hp * 2 <= e.maxHp) v *= c.kw.execute;
        const room = x.p.kws.includes('pierce') ? e.eff - e.shield : e.eff;
        let score: number;
        if (venom) score = 0.85 * Math.min(poisonTotal(v), e.eff) + (v >= e.eff ? e.threat + 2 : 0);
        else score = Math.min(v, Math.max(0, room)) + (v >= room ? 1.3 * e.threat + 2 + (e.trick ? 1.5 : 0) : (0.2 * e.threat) / Math.max(1, room)) - 0.8 * e.thorns;
        if (score > bestScore) { bestScore = score; target = e; }
      }
      if (!target) break;
      let v = x.p.value;
      if (x.p.kws.includes('execute') && target.hp * 2 <= target.maxHp) v *= c.kw.execute;
      if (venom) { u += 0.85 * Math.min(poisonTotal(v), target.eff); target.eff -= v; }
      else {
        const room = x.p.kws.includes('pierce') ? target.eff - target.shield : target.eff;
        u += Math.max(0, Math.min(v, room)) - 0.8 * target.thorns;
        target.eff -= x.p.kws.includes('pierce') ? v + target.shield : v;
        target.hp -= v;
      }
    }
  }
  let alive = 0;
  for (let i = 0; i < en.length; i++) {
    const e = en[i]!;
    if (e.eff <= 0) {
      if (c.enemies[i]!.eff > 0) { prevented += e.threat; u += 1.5 + (e.trick ? 1.5 : 0); }
    } else alive++;
  }
  if (alive === 0) u += 20;

  for (const x of uses) {
    if (x.p.effect !== 'weaken') continue;
    const all = x.p.kws.includes('cleave');
    let top: (typeof en)[number] | null = null;
    for (const e of en) {
      if (e.eff <= 0 || e.perHit <= 0) continue;
      if (all) { const cut = Math.min(x.p.value * x.times, e.perHit) * e.hits; prevented += cut; e.perHit -= Math.min(x.p.value * x.times, e.perHit); }
      else if (!top || Math.min(x.p.value, e.perHit) * e.hits > Math.min(x.p.value, top.perHit) * top.hits) top = e;
    }
    if (top) { const cut = Math.min(x.p.value * x.times, top.perHit); prevented += cut * top.hits; top.perHit -= cut; }
  }
  prevented = Math.min(prevented, totalIncoming);
  const factor = totalIncoming > 0 ? (totalIncoming - prevented) / totalIncoming : 0;
  for (const h of c.living) inc[h] = (inc[h] ?? 0) * factor;

  for (const x of uses) {
    if (x.p.effect === 'shield') {
      const v = x.p.value * x.times;
      const keep = x.p.kws.includes('ward') ? 0.4 : 0.03;
      if (x.p.kws.includes('cleave')) {
        for (const h of c.living) { const b = Math.min(v, inc[h] ?? 0); blocked += b; inc[h] = (inc[h] ?? 0) - b; u += keep * (v - b); }
      } else {
        let t = c.living[0] ?? 0;
        for (const h of c.living) if ((inc[h] ?? 0) > (inc[t] ?? 0)) t = h;
        const b = Math.min(v, inc[t] ?? 0);
        blocked += b;
        inc[t] = (inc[t] ?? 0) - b;
        u += keep * (v - b);
      }
    } else if (x.p.effect === 'heal') {
      const v = x.p.value * x.times;
      if (x.p.kws.includes('cleave')) { for (const h of c.living) { const a = Math.min(v, missing[h] ?? 0); healed += a; missing[h] = (missing[h] ?? 0) - a; } }
      else {
        let t = c.living[0] ?? 0;
        for (const h of c.living) if ((missing[h] ?? 0) > (missing[t] ?? 0)) t = h;
        const a = Math.min(v, missing[t] ?? 0);
        healed += a;
        missing[t] = (missing[t] ?? 0) - a;
      }
    } else if (x.p.effect === 'focus') u += alive > 0 ? 0.75 * x.p.value : 0;
  }
  // Heroes who would be downed are worth a lot to save.
  for (const h of c.living) {
    if ((c.incoming[h] ?? 0) >= c.hp[h]! && c.incoming[h]! > 0) u += (inc[h] ?? 0) < c.hp[h]! ? 6 : -2;
  }
  return u + K.block * (prevented + blocked) + K.heal * healed;
}

// ---------------------------------------------------------------- expected value of lock choices

/** Averages a table over every face of the dice in `mask` (bit d = die d is rerolled). */
export function averageOver(table: Float64Array, n: number, mask: number): Float64Array {
  let cur = table;
  let stride = 1;
  for (let d = 0; d < n; d++) {
    if (mask & (1 << d)) {
      const next = new Float64Array(cur.length);
      const block = stride * 6;
      for (let base = 0; base < cur.length; base += block) {
        for (let off = 0; off < stride; off++) {
          let sum = 0;
          for (let f = 0; f < 6; f++) sum += cur[base + f * stride + off]!;
          const avg = sum / 6;
          for (let f = 0; f < 6; f++) next[base + f * stride + off] = avg;
        }
      }
      cur = next;
    }
    stride *= 6;
  }
  return cur;
}

export interface RollChoice {
  /** Bitmask of dice to reroll; 0 = stop rolling and use the dice. */
  reroll: number;
  /** True if the reroll is the free single-die one. */
  free: boolean;
  stopValue: number;
  bestValue: number;
}

/**
 * Best lock choice for the showing dice.
 * `canReroll[d]` is false for jammed dice. `freeSingle` = a single-die reroll costs nothing right now.
 * `rerollBonus` = extra value per die rerolled (items like Loaded Pip).
 */
export function chooseReroll(
  c: RollCtx, showing: number[], rerollsLeft: number, spent: number, canReroll: boolean[], freeSingle: boolean, rerollBonus: number, leftoverValue: number,
): RollChoice {
  const n = c.n;
  const size = 6 ** n;
  const depth = Math.min(rerollsLeft, 3);
  const tables = c.tables;
  const faces: number[] = new Array<number>(n).fill(0);
  const tableFor = (s: number): Float64Array => {
    const key = c.spentMatters ? s : 0;
    let t = tables[key];
    if (!t) {
      t = new Float64Array(size);
      for (let i = 0; i < size; i++) {
        let x = i;
        for (let d = 0; d < n; d++) { faces[d] = x % 6; x = (x - faces[d]!) / 6; }
        t[i] = utility(c, faces, key);
      }
      tables[key] = t;
    }
    return t;
  };
  let allowed = 0;
  for (let d = 0; d < n; d++) if (canReroll[d]) allowed |= 1 << d;
  const masks: number[] = [];
  for (let m = 1; m < 1 << n; m++) if ((m & allowed) === m) masks.push(m);
  const bits = (m: number): number => { let k = 0; for (let d = 0; d < n; d++) if (m & (1 << d)) k++; return k; };
  let index = 0;
  for (let d = n - 1; d >= 0; d--) index = index * 6 + showing[d]!;

  // W[k] = value of a position with k rerolls still to spend (after `depth - k` more have been spent).
  let w: Float64Array = tableFor(spent + depth);
  if (leftoverValue !== 0 && depth < rerollsLeft) w = w.map((v) => v + leftoverValue * (rerollsLeft - depth));
  const levels: Float64Array[] = [w];
  for (let k = 1; k <= depth; k++) {
    const stop = tableFor(spent + depth - k);
    const prev = levels[k - 1]!;
    const cur = new Float64Array(size);
    const left = rerollsLeft - (depth - k);
    for (let i = 0; i < size; i++) cur[i] = stop[i]! + leftoverValue * left;
    for (const m of masks) {
      const avg = averageOver(prev, n, m);
      const bonus = rerollBonus * bits(m);
      for (let i = 0; i < size; i++) if (avg[i]! + bonus > cur[i]!) cur[i] = avg[i]! + bonus;
    }
    levels.push(cur);
  }
  const stopValue = tableFor(spent)[index]! + leftoverValue * rerollsLeft;
  let best: RollChoice = { reroll: 0, free: false, stopValue, bestValue: stopValue };
  if (depth > 0) {
    const prev = levels[depth - 1]!;
    for (const m of masks) {
      const v = averageOver(prev, n, m)[index]! + rerollBonus * bits(m);
      if (v > best.bestValue + 1e-9) best = { reroll: m, free: false, stopValue, bestValue: v };
    }
  }
  if (freeSingle) {
    const same = levels[depth]!;
    for (const m of masks) {
      if (bits(m) !== 1) continue;
      const v = averageOver(same, n, m)[index]! + rerollBonus;
      if (v > best.bestValue + 1e-9) best = { reroll: m, free: true, stopValue, bestValue: v };
    }
  }
  return best;
}
