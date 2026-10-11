/** Run structure: starting runs, encounters, fight results, rewards, doors, rest, shop, events. */
import type {
  DoorKind, DoorOption, EncounterDef, EventChoiceDef, EventOutcome, FaceDef, FaceState, FightState, HeroId, HeroState, ItemDef, ItemId,
  Rarity, RewardOption, RewardState, RunMode, ShopSlot,
} from '@shared';
import { addGold, beginFight, fire, healHero } from './combat';
import type { Ctx } from './ctx';
import { bump, seen, sumAllMods } from './ctx';
import type { Db } from './db';
import { checkFeats, computeScore, recordRunEnd, recordRunStart } from './meta';
import { eventStream, mapStream, nextInt, pureInt, rand32, rewardStream, shopStream } from './rng';

type Weights = [number, number, number];
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare'];
const FALLBACK: Record<Rarity, Rarity[]> = {
  common: ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'common', 'rare'],
  rare: ['rare', 'uncommon', 'common'],
};

export function toFaceState(f: FaceDef): FaceState {
  return { defId: f.id, name: f.name, effect: f.effect, symbol: f.symbol, value: f.value, keywords: f.keywords.slice(), upgrades: 0 };
}

export function canUpgrade(db: Db, f: FaceState | undefined): boolean {
  return !!f && f.effect !== 'blank' && f.upgrades < db.rules.maxUpgradesPerFace;
}

export function hasUpgradable(db: Db, h: HeroState): boolean {
  return h.faces.some((f) => canUpgrade(db, f));
}

// ---------------------------------------------------------------- starting a run

/** Creates the run (no fight yet). */
export function createRun(c: Ctx, heroes: HeroId[], tier: number, seed: string, mode: RunMode, dateKey: string | null): void {
  const run = {
    seed, mode, dateKey, tier,
    heroes: heroes.map((id): HeroState => {
      const def = c.db.heroes.get(id)!;
      return { heroId: id, hp: def.maxHp, maxHp: def.maxHp, faces: def.faces.map(toFaceState), items: [], downed: false };
    }),
    gold: 0, act: 1 as const, slot: 1 as const, fightsWon: 0, phase: 'fight' as const, eliteNext: false,
    fight: null, reward: null, doors: null, shop: null, event: null, rest: null,
    stats: { turn: {}, fight: {}, run: {} }, limits: {}, rng: {}, featsEarned: [], score: 0,
  };
  c.game.run = run;
  c.run = run;
  c.mods = null;
}

export function startNewRun(c: Ctx, heroes: HeroId[], tier: number, seed: string, mode: RunMode, dateKey: string | null): void {
  createRun(c, heroes, tier, seed, mode, dateKey);
  recordRunStart(c);
  enterFight(c);
}

// ---------------------------------------------------------------- encounters

function fallbackEncounters(db: Db, act: number, kind: EncounterDef['kind']): EncounterDef[] {
  for (let a = act; a >= 1; a--) {
    const l = db.encounters(a, kind);
    if (l.length) return l;
  }
  if (kind !== 'normal') {
    for (let a = act; a >= 1; a--) {
      const l = db.encounters(a, 'normal');
      if (l.length) return l;
    }
  }
  return db.content.encounters;
}

/** The encounter for a slot. A pure function of the seed, so it never depends on player choices. */
export function pickEncounter(db: Db, seed: string, act: number, slot: number, kind: EncounterDef['kind']): EncounterDef {
  const stream = mapStream(act);
  if (kind !== 'normal') {
    const l = fallbackEncounters(db, act, kind);
    if (!l.length) throw new Error('content has no encounters');
    return l[pureInt(seed, stream, kind === 'boss' ? 20 : 10 + slot, l.length)]!;
  }
  const all = fallbackEncounters(db, act, 'normal');
  if (!all.length) throw new Error('content has no encounters');
  const used: EncounterDef[] = [];
  let pick = all[0]!;
  for (let s = 1; s <= slot; s++) {
    let cands = all.filter((e) => (!e.slots || e.slots.includes(s as 1 | 2 | 3)) && !used.includes(e));
    if (!cands.length) cands = all.filter((e) => !e.slots || e.slots.includes(s as 1 | 2 | 3));
    if (!cands.length) cands = all.filter((e) => !used.includes(e));
    if (!cands.length) cands = all;
    pick = cands[pureInt(seed, stream, s, cands.length)]!;
    used.push(pick);
  }
  return pick;
}

function fightKind(c: Ctx): FightState['kind'] {
  const run = c.run;
  if (run.slot === 4) return 'boss';
  return run.eliteNext || c.db.tier(run.tier).forceElite.includes(run.slot) ? 'elite' : 'normal';
}

/** Starts the fight for the current act / slot. */
export function enterFight(c: Ctx): void {
  const run = c.run;
  run.reward = null;
  run.doors = null;
  run.shop = null;
  run.event = null;
  run.rest = null;
  if (run.mode === 'tutorial') beginFight(c, c.db.content.tutorial.encounter, 'normal');
  else {
    const kind = fightKind(c);
    beginFight(c, pickEncounter(c.db, run.seed, run.act, run.slot, kind), kind);
  }
  run.eliteNext = false;
  settle(c);
}

/** If the fight just ended, moves the run on. Call after anything that can end a fight. */
export function settle(c: Ctx): void {
  if (c.over === 1) winFight(c);
  else if (c.over === 2) finishRun(c, false);
}

export function finishRun(c: Ctx, won: boolean): void {
  const run = c.run;
  run.phase = won ? 'victory' : 'defeat';
  run.fight = null;
  run.reward = null;
  run.doors = null;
  run.shop = null;
  run.event = null;
  run.rest = null;
  c.over = 0;
  recordRunEnd(c, won);
  c.ev.push({ type: 'phase', phase: run.phase });
}

function winFight(c: Ctx): void {
  const run = c.run;
  const f = run.fight!;
  const kind = f.kind;
  if (run.mode === 'tutorial') {
    c.ev.push({ type: 'fightWon', gold: 0 });
    finishRun(c, true);
    return;
  }
  run.fightsWon++;
  bump(c, 'fightsWon', 1);
  if (kind === 'elite') bump(c, 'elitesWon', 1);
  if (kind === 'boss') bump(c, 'bossesWon', 1);
  const rules = c.db.rules;
  const gold = addGold(c, rules.goldPerFight[kind === 'normal' ? 0 : kind === 'elite' ? 1 : 2], true, true);
  c.ev.push({ type: 'fightWon', gold });
  checkFeats(c, 'turnEnd');
  checkFeats(c, 'fightWon');
  if (kind === 'boss') checkFeats(c, 'bossWon');
  run.score = computeScore(c, false);
  const last = kind === 'boss' && run.act === 3;
  if (last) {
    finishRun(c, true);
    return;
  }
  // The fight is over: fightEnd triggers and heals run with the enemy row empty.
  c.over = 0;
  fire(c, 'fightEnd', {});
  const heal = sumAllMods(c, 'healAfterFight');
  for (let i = 0; i < run.heroes.length; i++) {
    const h = run.heroes[i]!;
    if (h.downed) continue;
    if (heal > 0) healHero(c, i, heal);
    if (kind === 'boss') healHero(c, i, Math.floor((h.maxHp * rules.bossHealPct) / 100));
  }
  c.over = 0;
  run.fight = null;
  c.mods = null;
  const reward = fightReward(c, kind, kind === 'elite' ? Math.max(0, rules.eliteRewardPicks - 1) : 0);
  if (reward) showReward(c, reward);
  else afterFightReward(c);
}

// ---------------------------------------------------------------- rewards

function rollRarity(c: Ctx, stream: string, w: Weights | undefined): Rarity {
  const total = w ? w[0] + w[1] + w[2] : 0;
  if (!w || total <= 0) return 'common';
  let r = nextInt(c.run, stream, total);
  for (let i = 0; i < 3; i++) {
    r -= w[i]!;
    if (r < 0) return RARITIES[i]!;
  }
  return 'common';
}

function pickRar<T extends { rarity: Rarity }>(c: Ctx, stream: string, list: T[], rarity: Rarity): T | null {
  for (const r of FALLBACK[rarity]) {
    const cs = list.filter((x) => x.rarity === r);
    if (cs.length) return cs[nextInt(c.run, stream, cs.length)]!;
  }
  return null;
}

/** Items that can be offered now: unlocked (everything in a daily run) and not already held. */
export function itemPool(c: Ctx, exclude: ItemId[]): ItemDef[] {
  const run = c.run;
  const all = run.mode === 'daily';
  const unlocked = c.game.profile.unlockedItems;
  return c.db.content.items.filter((it) =>
    (all || !it.locked || unlocked.includes(it.id)) && !exclude.includes(it.id) && !run.heroes.some((h) => h.items.includes(it.id)));
}

function faceOption(c: Ctx, stream: string, w: Weights | undefined, opts: RewardOption[], rarity?: Rarity): RewardOption | null {
  const run = c.run;
  const n = run.heroes.length;
  const start = nextInt(run, stream, n);
  const rar = rarity ?? rollRarity(c, stream, w);
  for (let k = 0; k < n; k++) {
    const hi = (start + k) % n;
    if (opts.some((o) => o.type === 'face' && o.hero === hi)) continue;
    const id = run.heroes[hi]!.heroId;
    const pool = c.db.content.rewardFaces.filter((f) =>
      (f.heroes === 'any' || f.heroes.includes(id)) && !opts.some((o) => o.type === 'face' && o.face.defId === f.id));
    const pick = pickRar(c, stream, pool, rar);
    if (pick) return { type: 'face', hero: hi, face: toFaceState(pick), rarity: pick.rarity };
  }
  return null;
}

function upgradeOption(c: Ctx, stream: string, opts: RewardOption[], amount: number): RewardOption | null {
  const run = c.run;
  const cands: number[] = [];
  run.heroes.forEach((h, i) => {
    if (hasUpgradable(c.db, h) && !opts.some((o) => o.type === 'upgrade' && o.hero === i)) cands.push(i);
  });
  if (!cands.length) return null;
  return { type: 'upgrade', hero: cands[nextInt(run, stream, cands.length)]!, amount };
}

function itemOption(c: Ctx, stream: string, w: Weights | undefined, opts: RewardOption[], rarity?: Rarity): RewardOption | null {
  const exclude: ItemId[] = [];
  for (const o of opts) if (o.type === 'item') exclude.push(o.item);
  const pool = itemPool(c, exclude);
  if (!pool.length) return null;
  const pick = pickRar(c, stream, pool, rarity ?? rollRarity(c, stream, w));
  return pick ? { type: 'item', item: pick.id, rarity: pick.rarity } : null;
}

/** One reward screen after a fight: a face, an upgrade and an item where the content allows, three options in all. */
function fightReward(c: Ctx, kind: FightState['kind'], picksLeft: number): RewardState | null {
  const run = c.run;
  const stream = rewardStream(run);
  const rules = c.db.rules;
  const w = rules.rarityWeights[kind][run.act - 1];
  const opts: RewardOption[] = [];
  const makers = [
    (): RewardOption | null => faceOption(c, stream, w, opts),
    (): RewardOption | null => upgradeOption(c, stream, opts, rules.upgradeAmount),
    (): RewardOption | null => itemOption(c, stream, w, opts),
  ];
  for (let round = 0; round < 3 && opts.length < 3; round++) {
    for (const make of makers) {
      if (opts.length >= 3) break;
      const o = make();
      if (o) opts.push(o);
    }
  }
  return opts.length ? { options: opts, picksLeft, source: 'fight' } : null;
}

function showReward(c: Ctx, r: RewardState): void {
  c.run.reward = r;
  c.run.phase = 'reward';
  for (const o of r.options) if (o.type === 'item') seen(c, 'items', o.item);
  c.ev.push({ type: 'phase', phase: 'reward' });
}

function applyMaxHp(h: HeroState, delta: number): void {
  if (delta === 0) return;
  h.maxHp = Math.max(1, h.maxHp + delta);
  if (delta > 0 && !h.downed) h.hp += delta;
  if (h.hp > h.maxHp) h.hp = h.maxHp;
}

function itemMaxHp(db: Db, id: ItemId): number {
  let n = 0;
  for (const m of db.itemMods.get(id) ?? []) if (m.type === 'maxHp') n += m.amount;
  return n;
}

/** Gives an item to a hero, replacing the one in `replace` if given. */
export function giveItem(c: Ctx, hi: number, item: ItemId, replace: number | undefined): void {
  const h = c.run.heroes[hi]!;
  if (replace !== undefined && h.items[replace] !== undefined) {
    applyMaxHp(h, -itemMaxHp(c.db, h.items[replace]!));
    h.items[replace] = item;
  } else h.items.push(item);
  applyMaxHp(h, itemMaxHp(c.db, item));
  c.mods = null;
  bump(c, 'itemsTaken', 1);
  seen(c, 'items', item);
}

export function replaceFace(c: Ctx, hi: number, fi: number, face: FaceState): void {
  const h = c.run.heroes[hi]!;
  h.faces = h.faces.slice();
  h.faces[fi] = { ...face, keywords: face.keywords.slice() };
  bump(c, 'facesReplaced', 1);
}

export function upgradeFace(c: Ctx, hi: number, fi: number, amount: number): void {
  const h = c.run.heroes[hi]!;
  const f = h.faces[fi]!;
  h.faces = h.faces.slice();
  h.faces[fi] = { ...f, value: f.value + amount, upgrades: f.upgrades + 1 };
  bump(c, 'facesUpgraded', 1);
}

/** Why an item cannot go to this hero slot, or null if it can. */
export function itemPlacementError(c: Ctx, hero: number | undefined, replace: number | undefined): string | null {
  if (hero === undefined || !Number.isInteger(hero)) return 'choose a hero for the item';
  const h = c.run.heroes[hero];
  if (!h) return 'no such hero';
  const slots = c.db.heroes.get(h.heroId)?.itemSlots ?? 0;
  if (h.items.length >= slots) {
    if (replace === undefined || !Number.isInteger(replace) || h.items[replace] === undefined) return 'choose an item to replace';
  } else if (replace !== undefined) return 'the hero has a free slot';
  return null;
}

export function pickReward(c: Ctx, option: number, hero: number | undefined, face: number | undefined, replace: number | undefined): void {
  const o = c.run.reward!.options[option]!;
  if (o.type === 'face') replaceFace(c, o.hero, face!, o.face);
  else if (o.type === 'upgrade') upgradeFace(c, o.hero, face!, o.amount);
  else giveItem(c, hero!, o.item, replace);
  c.ev.push({ type: 'rewardTaken', option: o });
  rewardDone(c);
}

export function skipReward(c: Ctx): void {
  c.ev.push({ type: 'rewardTaken', option: null });
  rewardDone(c);
}

function rewardDone(c: Ctx): void {
  const run = c.run;
  const r = run.reward!;
  run.reward = null;
  if (r.source === 'fight') {
    // Only elite fights give extra picks, so a follow-up screen is always an elite one.
    const next = r.picksLeft > 0 ? fightReward(c, 'elite', r.picksLeft - 1) : null;
    if (next) showReward(c, next);
    else afterFightReward(c);
    return;
  }
  if (r.source === 'event' && r.picksLeft > 0 && run.event && run.event.chosen !== null) {
    const choice = c.db.events.get(run.event.eventId)?.choices[run.event.chosen];
    if (choice) {
      const total = choice.outcomes.filter(isRewardOutcome).length;
      const next = eventReward(c, choice, total - r.picksLeft);
      if (next) {
        showReward(c, next);
        return;
      }
    }
  }
  enterFight(c);
}

function afterFightReward(c: Ctx): void {
  const run = c.run;
  if (run.slot === 4) {
    run.act = (run.act + 1) as 1 | 2 | 3;
    run.slot = 1;
    enterFight(c);
    return;
  }
  run.slot = (run.slot + 1) as 2 | 3 | 4;
  offerDoors(c);
}

// ---------------------------------------------------------------- doors

function eventsFor(c: Ctx): string[] {
  const run = c.run;
  const stream = mapStream(run.act);
  const list = c.db.content.events
    .map((e, i) => ({ id: e.id, acts: e.acts, k: rand32(run.seed, stream, 100 + i) }))
    .filter((e) => e.acts.includes(run.act));
  list.sort((a, b) => a.k - b.k || (a.id < b.id ? -1 : 1));
  return list.map((e) => e.id);
}

function doorEligible(c: Ctx, kind: DoorKind): boolean {
  const run = c.run;
  switch (kind) {
    case 'elite': return run.slot !== 4 && !c.db.tier(run.tier).forceElite.includes(run.slot) && c.db.encounters(run.act, 'elite').length > 0;
    case 'event': return eventsFor(c).length > 0;
    case 'treasure': return itemPool(c, []).length > 0;
    default: return true;
  }
}

function offerDoors(c: Ctx): void {
  const run = c.run;
  const stream = mapStream(run.act);
  const cands = c.db.content.doors.filter((d, i, all) =>
    (d.weight[run.act - 1] ?? 0) > 0 && all.findIndex((x) => x.kind === d.kind) === i && doorEligible(c, d.kind));
  const doors: DoorOption[] = [];
  for (let n = 0; n < 2 && cands.length; n++) {
    let total = 0;
    for (const d of cands) total += d.weight[run.act - 1]!;
    let r = pureInt(run.seed, stream, 30 + run.slot * 2 + n, total);
    let idx = 0;
    for (let i = 0; i < cands.length; i++) {
      r -= cands[i]!.weight[run.act - 1]!;
      if (r < 0) { idx = i; break; }
    }
    doors.push({ kind: cands[idx]!.kind });
    cands.splice(idx, 1);
  }
  if (!doors.length) {
    enterFight(c);
    return;
  }
  run.doors = doors;
  run.phase = 'doors';
  c.ev.push({ type: 'phase', phase: 'doors' });
}

export function pickDoor(c: Ctx, door: number): void {
  const run = c.run;
  const kind = run.doors![door]!.kind;
  run.doors = null;
  switch (kind) {
    case 'elite':
      run.eliteNext = true;
      enterFight(c);
      return;
    case 'onward':
      enterFight(c);
      return;
    case 'rest':
      run.rest = { used: false };
      run.phase = 'rest';
      break;
    case 'shop':
      run.shop = { slots: makeShop(c) };
      run.phase = 'shop';
      break;
    case 'event': {
      const ids = eventsFor(c);
      if (!ids.length) {
        enterFight(c);
        return;
      }
      run.event = { eventId: ids[(run.slot - 2 + ids.length) % ids.length]!, chosen: null };
      run.phase = 'event';
      break;
    }
    case 'treasure': {
      const stream = eventStream(run);
      const w = c.db.rules.rarityWeights.normal[run.act - 1];
      const opts: RewardOption[] = [];
      for (let i = 0; i < c.db.rules.treasureChoices; i++) {
        const o = itemOption(c, stream, w, opts);
        if (o) opts.push(o);
      }
      if (!opts.length) {
        enterFight(c);
        return;
      }
      showReward(c, { options: opts, picksLeft: 0, source: 'treasure' });
      return;
    }
  }
  c.ev.push({ type: 'phase', phase: run.phase });
}

/** Leaves the rest stop, the shop or a finished event. */
export function leave(c: Ctx): void {
  const run = c.run;
  if (run.phase === 'event' && run.reward) {
    showReward(c, run.reward);
    return;
  }
  enterFight(c);
}

// ---------------------------------------------------------------- rest

export function restHeal(c: Ctx): void {
  const run = c.run;
  for (let i = 0; i < run.heroes.length; i++) healHero(c, i, Math.floor((run.heroes[i]!.maxHp * c.db.rules.restHealPct) / 100));
  run.rest = { used: true };
}

export function restUpgrade(c: Ctx, hero: number, face: number): void {
  upgradeFace(c, hero, face, c.db.rules.upgradeAmount);
  c.run.rest = { used: true };
}

// ---------------------------------------------------------------- shop

function makeShop(c: Ctx): ShopSlot[] {
  const run = c.run;
  const shop = c.db.rules.shop;
  const stream = shopStream(run);
  const w = c.db.rules.rarityWeights.normal[run.act - 1];
  const discount = sumAllMods(c, 'shopDiscountPct');
  const price = (n: number): number => Math.max(0, Math.floor((n * (100 - discount)) / 100));
  const slots: ShopSlot[] = [];
  const opts: RewardOption[] = [];
  for (let i = 0; i < shop.itemsOffered; i++) {
    const o = itemOption(c, stream, w, opts);
    if (o && o.type === 'item') {
      opts.push(o);
      seen(c, 'items', o.item);
      slots.push({ type: 'item', item: o.item, price: price(shop.itemPrice[o.rarity]), sold: false });
    }
  }
  for (let i = 0; i < shop.facesOffered; i++) {
    const o = faceOption(c, stream, w, opts);
    if (o && o.type === 'face') {
      opts.push(o);
      slots.push({ type: 'face', hero: o.hero, face: o.face, price: price(shop.facePrice[o.rarity]), sold: false });
    }
  }
  slots.push({ type: 'upgrade', price: price(shop.upgradePrice), sold: false });
  slots.push({ type: 'heal', price: price(shop.healPrice), sold: false });
  return slots;
}

export function shopBuy(c: Ctx, slot: number, hero: number | undefined, face: number | undefined, replace: number | undefined): void {
  const run = c.run;
  const s = run.shop!.slots[slot]!;
  run.gold -= s.price;
  bump(c, 'goldSpent', s.price);
  if (s.price !== 0) c.ev.push({ type: 'gold', amount: -s.price });
  s.sold = true;
  switch (s.type) {
    case 'item': giveItem(c, hero!, s.item, replace); break;
    case 'face': replaceFace(c, s.hero, face!, s.face); break;
    case 'upgrade': upgradeFace(c, hero!, face!, c.db.rules.upgradeAmount); break;
    case 'heal':
      for (let i = 0; i < run.heroes.length; i++) healHero(c, i, Math.floor((run.heroes[i]!.maxHp * c.db.rules.shop.healPct) / 100));
      break;
  }
}

// ---------------------------------------------------------------- events

function isRewardOutcome(o: EventOutcome): boolean {
  return o.type === 'item' || o.type === 'rewardFace' || (o.type === 'upgradeFace' && o.target === 'choose');
}

/** The reward screen for the k-th (or a later) reward-type outcome of an event choice. */
function eventReward(c: Ctx, choice: EventChoiceDef, k: number): RewardState | null {
  const run = c.run;
  const outs = choice.outcomes.filter(isRewardOutcome);
  const stream = eventStream(run);
  const w = c.db.rules.rarityWeights.normal[run.act - 1];
  for (let i = k; i < outs.length; i++) {
    const o = outs[i]!;
    const opts: RewardOption[] = [];
    if (o.type === 'item') {
      if (o.item) {
        const def = c.db.items.get(o.item);
        if (def && !run.heroes.some((h) => h.items.includes(def.id))) opts.push({ type: 'item', item: def.id, rarity: def.rarity });
      } else {
        const it = itemOption(c, stream, w, opts, o.rarity);
        if (it) opts.push(it);
      }
    } else if (o.type === 'rewardFace') {
      for (let n = 0; n < run.heroes.length; n++) {
        const f = faceOption(c, stream, w, opts, o.rarity);
        if (f) opts.push(f);
      }
    } else if (o.type === 'upgradeFace') {
      run.heroes.forEach((h, hi) => {
        if (hasUpgradable(c.db, h)) opts.push({ type: 'upgrade', hero: hi, amount: o.amount });
      });
    }
    if (opts.length) return { options: opts, picksLeft: outs.length - i - 1, source: 'event' };
  }
  return null;
}

function blankFace(c: Ctx, h: HeroState): FaceState {
  const own = c.db.heroes.get(h.heroId)?.faces.find((f) => f.effect === 'blank');
  let def = own;
  if (!def) for (const hd of c.db.content.heroes) { def = hd.faces.find((f) => f.effect === 'blank'); if (def) break; }
  return { defId: def?.id ?? 'blank', name: def?.name ?? '', effect: 'blank', symbol: null, value: 0, keywords: [], upgrades: 0 };
}

function applyOutcome(c: Ctx, o: EventOutcome): void {
  const run = c.run;
  const stream = eventStream(run);
  const living: number[] = [];
  run.heroes.forEach((h, i) => { if (!h.downed) living.push(i); });
  const everyone = run.heroes.map((_, i) => i);
  const random = (l: number[]): number[] => (l.length ? [l[nextInt(run, stream, l.length)]!] : []);
  switch (o.type) {
    case 'gold': addGold(c, o.amount, false); break;
    case 'heal': {
      let t = living;
      if (o.target === 'lowest') t = living.length ? [living.reduce((a, b) => (run.heroes[b]!.hp < run.heroes[a]!.hp ? b : a))] : [];
      else if (o.target === 'random') t = random(living);
      for (const i of t) healHero(c, i, o.amount);
      break;
    }
    case 'hurt': {
      let t = living;
      if (o.target === 'highest') t = living.length ? [living.reduce((a, b) => (run.heroes[b]!.hp > run.heroes[a]!.hp ? b : a))] : [];
      else if (o.target === 'random') t = random(living);
      for (const i of t) {
        const h = run.heroes[i]!;
        const lost = Math.max(0, Math.min(o.amount, h.hp - 1));
        if (lost <= 0) continue;
        h.hp -= lost;
        bump(c, 'hpLost', lost);
        c.ev.push({ type: 'damage', target: { side: 'hero', index: i }, amount: lost, blocked: 0, source: null, cause: 'item' });
      }
      break;
    }
    case 'maxHp':
      for (const i of o.target === 'all' ? everyone : random(everyone)) applyMaxHp(run.heroes[i]!, o.amount);
      break;
    case 'upgradeFace': {
      if (o.target !== 'random') break;
      const cands: [number, number][] = [];
      run.heroes.forEach((h, hi) => h.faces.forEach((f, fi) => { if (canUpgrade(c.db, f)) cands.push([hi, fi]); }));
      if (cands.length) {
        const [hi, fi] = cands[nextInt(run, stream, cands.length)]!;
        upgradeFace(c, hi, fi, o.amount);
      }
      break;
    }
    case 'blankFace': {
      const cands: [number, number][] = [];
      run.heroes.forEach((h, hi) => h.faces.forEach((f, fi) => { if (f.effect !== 'blank') cands.push([hi, fi]); }));
      if (!cands.length) break;
      let pick = cands[0]!;
      if (o.target === 'random') pick = cands[nextInt(run, stream, cands.length)]!;
      else for (const x of cands) if (run.heroes[x[0]]!.faces[x[1]]!.value < run.heroes[pick[0]]!.faces[pick[1]]!.value) pick = x;
      const h = run.heroes[pick[0]]!;
      h.faces = h.faces.slice();
      h.faces[pick[1]] = blankFace(c, h);
      break;
    }
    case 'item':
    case 'rewardFace':
    case 'nothing':
      break;
  }
}

export function eventChoice(c: Ctx, choice: number): void {
  const run = c.run;
  const ev = run.event!;
  const def = c.db.events.get(ev.eventId)!.choices[choice]!;
  if (def.costGold) {
    run.gold -= def.costGold;
    bump(c, 'goldSpent', def.costGold);
    c.ev.push({ type: 'gold', amount: -def.costGold });
  }
  ev.chosen = choice;
  for (const o of def.outcomes) applyOutcome(c, o);
  run.reward = eventReward(c, def, 0);
}
