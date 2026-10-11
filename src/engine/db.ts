/** Indexed, read-only view of a ContentDB. Built once per engine. */
import type {
  ContentDB, EncounterDef, EnemyDef, EventDef, FeatDef, HeroDef, ItemDef, KeywordId, Modifier, Rules, SetDef, SetKind,
  StatusId, SymbolId, Trigger, TriggeredEffect,
} from '@shared';
import { KEYWORDS } from '@shared';

export interface TrigRef {
  te: TriggeredEffect;
  /** Limit key, unique per source definition (the holder / enemy uid is appended at runtime). */
  key: string;
}
export type TrigIndex = Partial<Record<Trigger, TrigRef[]>>;

/** The cumulative effect of tiers 1..N. */
export interface TierMods {
  hpPct: number;
  attack: number;
  startShield: number;
  statuses: [StatusId, number][];
  rerolls: number;
  rerollsFirstTurn: number;
  forceElite: number[];
  healingPct: number;
  passives: { te: TriggeredEffect; kinds: ('normal' | 'elite' | 'boss')[]; key: string }[];
}

export interface Db {
  content: ContentDB;
  rules: Rules;
  heroes: Map<string, HeroDef>;
  items: Map<string, ItemDef>;
  enemies: Map<string, EnemyDef>;
  events: Map<string, EventDef>;
  kw: Record<KeywordId, number>;
  itemMods: Map<string, Modifier[]>;
  itemTrigs: Map<string, TrigIndex>;
  /** Triggers used by at least one item anywhere in the content. */
  itemTrigUsed: Set<Trigger>;
  tiers: TierMods[];
  maxTier: number;
  feats: Record<FeatDef['when'], FeatDef[]>;
  passiveCache: Map<string, TrigIndex>;
  setDef(kind: SetKind, symbol: SymbolId | null): SetDef | undefined;
  tier(n: number): TierMods;
  passives(enemy: EnemyDef, tier: number): TrigIndex;
  encounters(act: number, kind: EncounterDef['kind']): EncounterDef[];
}

function addTrig(ix: TrigIndex, te: TriggeredEffect, key: string): void {
  (ix[te.trigger] ??= []).push({ te, key });
}

export function buildDb(content: ContentDB): Db {
  const heroes = new Map<string, HeroDef>();
  for (const h of content.heroes) heroes.set(h.id, h);
  const items = new Map<string, ItemDef>();
  const itemMods = new Map<string, Modifier[]>();
  const itemTrigs = new Map<string, TrigIndex>();
  const itemTrigUsed = new Set<Trigger>();
  for (const it of content.items) {
    items.set(it.id, it);
    itemMods.set(it.id, it.modifiers ?? []);
    const ix: TrigIndex = {};
    (it.triggers ?? []).forEach((te, i) => {
      addTrig(ix, te, `${it.id}#${i}`);
      itemTrigUsed.add(te.trigger);
    });
    itemTrigs.set(it.id, ix);
  }
  const enemies = new Map<string, EnemyDef>();
  for (const e of content.enemies) enemies.set(e.id, e);
  const events = new Map<string, EventDef>();
  for (const e of content.events) events.set(e.id, e);

  const kw = {} as Record<KeywordId, number>;
  for (const k of KEYWORDS) kw[k] = 0;
  for (const k of content.keywords) kw[k.id] = k.param;

  const sorted = content.tiers.slice().sort((a, b) => a.tier - b.tier);
  const maxTier = sorted.length ? sorted[sorted.length - 1]!.tier : 0;
  const tiers: TierMods[] = [];
  for (let n = 0; n <= maxTier; n++) {
    const t: TierMods = { hpPct: 0, attack: 0, startShield: 0, statuses: [], rerolls: 0, rerollsFirstTurn: 0, forceElite: [], healingPct: 0, passives: [] };
    for (const def of sorted) {
      if (def.tier > n) break;
      def.modifiers.forEach((m, i) => {
        switch (m.type) {
          case 'enemyHpPct': t.hpPct += m.amount; break;
          case 'enemyAttack': t.attack += m.amount; break;
          case 'enemyStartShield': t.startShield += m.amount; break;
          case 'enemyStartStatus': t.statuses.push([m.status, m.amount]); break;
          case 'rerolls': if (m.firstTurnOnly) t.rerollsFirstTurn += m.amount; else t.rerolls += m.amount; break;
          case 'forceElite': if (!t.forceElite.includes(m.slot)) t.forceElite.push(m.slot); break;
          case 'healingPct': t.healingPct += m.amount; break;
          case 'enemyPassive': t.passives.push({ te: m.passive, kinds: m.kinds, key: `t${def.tier}#${i}` }); break;
        }
      });
    }
    tiers.push(t);
  }

  const feats: Db['feats'] = { turnEnd: [], fightWon: [], bossWon: [], runWon: [], runEnded: [] };
  for (const f of content.feats) feats[f.when].push(f);

  const setDefs = new Map<string, SetDef>();
  for (const s of content.sets) {
    const key = `${s.kind}|${s.symbol ?? ''}`;
    if (!setDefs.has(key)) setDefs.set(key, s);
  }
  const encCache = new Map<string, EncounterDef[]>();
  const passiveCache = new Map<string, TrigIndex>();

  const db: Db = {
    content, rules: content.rules, heroes, items, enemies, events, kw, itemMods, itemTrigs, itemTrigUsed, tiers, maxTier, feats, passiveCache,
    setDef: (kind, symbol) => (symbol !== null ? setDefs.get(`${kind}|${symbol}`) : undefined) ?? setDefs.get(`${kind}|`),
    tier: (n) => tiers[Math.max(0, Math.min(maxTier, n))]!,
    passives(enemy, tier) {
      const key = `${enemy.id}|${tier}`;
      let ix = passiveCache.get(key);
      if (!ix) {
        ix = {};
        (enemy.passives ?? []).forEach((te, i) => addTrig(ix!, te, `p#${i}`));
        for (const p of db.tier(tier).passives) if (p.kinds.includes(enemy.kind)) addTrig(ix, p.te, p.key);
        passiveCache.set(key, ix);
      }
      return ix;
    },
    encounters(act, kind) {
      const key = `${act}|${kind}`;
      let list = encCache.get(key);
      if (!list) {
        list = content.encounters.filter((e) => e.act === act && e.kind === kind);
        encCache.set(key, list);
      }
      return list;
    },
  };
  return db;
}
