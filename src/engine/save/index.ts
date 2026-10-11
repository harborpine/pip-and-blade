/** Save format: serialise, parse, migrate and validate. */
import type { GameState, Profile, RunState, SaveFile } from '@shared';
import { FACE_EFFECTS, KEYWORDS, SAVE_VERSION, SaveError, STATUSES, SYMBOLS } from '@shared';
import type { Db } from '../db';
import { newProfile } from '../meta';
import type { Migration } from './migrations';
import { MIGRATIONS, runMigrations } from './migrations';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => isNum(v) && Number.isInteger(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isArr = (v: unknown, each: (x: unknown) => boolean): v is unknown[] => Array.isArray(v) && v.every(each);
const isCounters = (v: unknown): boolean => isObj(v) && Object.values(v).every(isNum);

function fail(what: string): never {
  throw new SaveError(`Save file is not usable: ${what}`);
}

export function newSave(db: Db): SaveFile {
  return { app: 'pip-and-blade', version: SAVE_VERSION, game: { profile: newProfile(db), run: null }, settings: { reduceMotion: false } };
}

export function save(file: SaveFile): string {
  return JSON.stringify(file);
}

function loadProfile(db: Db, v: unknown): Profile {
  if (!isObj(v)) fail('profile missing');
  const st = v.stats;
  const seenV = v.seen;
  if (!isArr(v.unlockedHeroes, isStr) || !isArr(v.unlockedItems, isStr) || !isArr(v.featsDone, isStr) || !isInt(v.maxTier) || !isBool(v.tutorialDone)) fail('profile fields');
  if (!isObj(seenV) || !isArr(seenV.heroes, isStr) || !isArr(seenV.items, isStr) || !isArr(seenV.enemies, isStr)) fail('profile.seen');
  if (!isObj(st) || !isInt(st.runsPlayed) || !isInt(st.runsWon) || !isInt(st.winStreak) || !isInt(st.bestStreak) || !isInt(st.tierWon) || !isInt(st.dailyWins)
    || !isObj(st.perHero) || !isCounters(st.lifetime)) fail('profile.stats');
  if (!isObj(v.daily)) fail('profile.daily');
  const base = newProfile(db);
  const known = <T extends string>(list: unknown[], map: Map<string, unknown>): T[] => {
    const out: T[] = [];
    for (const x of list) if (isStr(x) && map.has(x) && !out.includes(x as T)) out.push(x as T);
    return out;
  };
  const p: Profile = base;
  for (const id of known<Profile['unlockedHeroes'][number]>(v.unlockedHeroes, db.heroes)) if (!p.unlockedHeroes.includes(id)) p.unlockedHeroes.push(id);
  p.unlockedItems = known(v.unlockedItems, db.items);
  p.featsDone = (v.featsDone as string[]).filter((x, i, a) => a.indexOf(x) === i);
  p.maxTier = Math.max(0, Math.min(db.maxTier, v.maxTier));
  p.tutorialDone = v.tutorialDone;
  p.seen = { heroes: known(seenV.heroes, db.heroes), items: known(seenV.items, db.items), enemies: known(seenV.enemies, db.enemies) };
  p.stats = {
    runsPlayed: Math.max(0, st.runsPlayed), runsWon: Math.max(0, st.runsWon), winStreak: Math.max(0, st.winStreak), bestStreak: Math.max(0, st.bestStreak),
    tierWon: Math.max(-1, st.tierWon), dailyWins: Math.max(0, st.dailyWins), perHero: {}, lifetime: { ...(st.lifetime as Profile['stats']['lifetime']) },
  };
  for (const [id, rec] of Object.entries(st.perHero)) {
    if (!db.heroes.has(id)) continue;
    if (!isObj(rec) || !isInt(rec.runs) || !isInt(rec.wins)) fail('profile.stats.perHero');
    p.stats.perHero[id as keyof Profile['stats']['perHero']] = { runs: rec.runs, wins: rec.wins };
  }
  for (const [key, rec] of Object.entries(v.daily)) {
    if (!isObj(rec) || !isInt(rec.attempts) || !isNum(rec.bestScore) || !isBool(rec.won)) fail('profile.daily');
    p.daily[key] = { attempts: rec.attempts, bestScore: rec.bestScore, won: rec.won };
  }
  return p;
}

const PHASES = ['fight', 'reward', 'doors', 'rest', 'shop', 'event', 'victory', 'defeat'];
const DOORS = ['elite', 'rest', 'shop', 'event', 'treasure', 'onward'];

function isFace(v: unknown): boolean {
  return isObj(v) && isStr(v.defId) && isStr(v.name) && (FACE_EFFECTS as readonly unknown[]).includes(v.effect)
    && (v.symbol === null || (SYMBOLS as readonly unknown[]).includes(v.symbol)) && isNum(v.value) && isInt(v.upgrades)
    && isArr(v.keywords, (k) => (KEYWORDS as readonly unknown[]).includes(k));
}

function isStatuses(v: unknown): boolean {
  return isObj(v) && Object.entries(v).every(([k, n]) => (STATUSES as readonly string[]).includes(k) && isNum(n));
}

/** 'ok' = usable, 'stale' = well-formed but refers to content that no longer exists, 'bad' = malformed. */
function checkRun(db: Db, v: unknown): 'ok' | 'stale' | 'bad' {
  if (!isObj(v)) return 'bad';
  let stale = false;
  if (!isStr(v.seed) || !['standard', 'daily', 'tutorial'].includes(v.mode as string) || !(v.dateKey === null || isStr(v.dateKey)) || !isInt(v.tier)
    || !isNum(v.gold) || ![1, 2, 3].includes(v.act as number) || ![1, 2, 3, 4].includes(v.slot as number) || !isInt(v.fightsWon)
    || !PHASES.includes(v.phase as string) || !isBool(v.eliteNext) || !isNum(v.score) || !isArr(v.featsEarned, isStr)
    || !isCounters(v.limits) || !isCounters(v.rng)) return 'bad';
  const stats = v.stats;
  if (!isObj(stats) || !isCounters(stats.turn) || !isCounters(stats.fight) || !isCounters(stats.run)) return 'bad';
  if (v.tier < 0 || v.tier > db.maxTier) stale = true;
  const heroes = v.heroes;
  if (!Array.isArray(heroes) || heroes.length === 0) return 'bad';
  for (const h of heroes as unknown[]) {
    if (!isObj(h) || !isStr(h.heroId) || !isInt(h.hp) || !isInt(h.maxHp) || h.maxHp < 1 || h.hp < 0 || h.hp > h.maxHp || !isBool(h.downed)
      || !isArr(h.faces, isFace) || (h.faces as unknown[]).length < 1 || !isArr(h.items, isStr)) return 'bad';
    if (!db.heroes.has(h.heroId) || (h.items as string[]).some((id) => !db.items.has(id))) stale = true;
  }
  const n = heroes.length;
  const heroIdx = (x: unknown): boolean => isInt(x) && x >= 0 && x < n;
  const f = v.fight;
  if (f !== null) {
    if (!isObj(f) || !isStr(f.encounterId) || !['normal', 'elite', 'boss'].includes(f.kind as string) || !isInt(f.turn) || !['rolling', 'acting'].includes(f.phase as string)
      || !isInt(f.rerollsLeft) || !isInt(f.rerollsSpent) || !isInt(f.nextTurnRerolls) || !isArr(f.nextTurnJams, heroIdx) || !isInt(f.nextEnemyUid)
      || !isInt(f.diceUsed) || !isCounters(f.limits) || !isArr(f.undo, isStr) || !Array.isArray(f.sets) || !Array.isArray(f.dice)
      || !Array.isArray(f.heroes) || f.heroes.length !== n || !Array.isArray(f.enemies)) return 'bad';
    for (const d of f.dice as unknown[]) {
      if (!isObj(d) || !heroIdx(d.hero) || !isInt(d.face) || d.face < 0 || d.face >= ((heroes[d.hero as number] as Obj).faces as unknown[]).length
        || !isBool(d.locked) || !isBool(d.jammed) || !isBool(d.used) || !isBool(d.rerolled) || !isBool(d.firstLocked) || !isNum(d.bonus)
        || !isNum(d.multiplier) || !isInt(d.repeats)) return 'bad';
    }
    for (const s of f.sets as unknown[]) {
      if (!isObj(s) || !isStr(s.kind) || !isArr(s.dice, (x) => isInt(x) && x >= 0 && x < (f.dice as unknown[]).length)) return 'bad';
    }
    for (const h of f.heroes as unknown[]) {
      if (!isObj(h) || !isNum(h.shield) || !isNum(h.ward) || !isStatuses(h.statuses) || !isArr(h.growth, isNum) || !isArr(h.cursed, isInt)) return 'bad';
    }
    for (const e of f.enemies as unknown[]) {
      if (!isObj(e) || !isInt(e.uid) || !isStr(e.enemyId) || !isInt(e.hp) || !isInt(e.maxHp) || !isNum(e.shield) || !isStatuses(e.statuses)
        || !isInt(e.cursor) || !(e.lastMoveId === null || isStr(e.lastMoveId)) || !isBool(e.summoned)) return 'bad';
      const it = e.intent;
      if (it !== null) {
        if (!isObj(it) || !isStr(it.moveId) || !isStr(it.moveName) || !Array.isArray(it.actions)) return 'bad';
        for (const a of it.actions as unknown[]) {
          if (!isObj(a) || !isStr(a.type) || !isNum(a.amount) || !isInt(a.hits) || !isBool(a.pierce) || !isNum(a.poison)
            || !isArr(a.heroes, heroIdx) || !isArr(a.enemies, isInt) || !isArr(a.faces, isInt)) return 'bad';
        }
      }
      if (!db.enemies.has(e.enemyId)) stale = true;
    }
  }
  const optionOk = (o: unknown, shop = false): boolean => {
    if (!isObj(o)) return false;
    if (o.type === 'item') {
      if (!isStr(o.item)) return false;
      if (!db.items.has(o.item)) stale = true;
      return true;
    }
    if (o.type === 'face') return heroIdx(o.hero) && isFace(o.face);
    if (o.type === 'upgrade') return shop || (heroIdx(o.hero) && isNum(o.amount));
    return shop && o.type === 'heal';
  };
  const r = v.reward;
  if (r !== null && (!isObj(r) || !isArr(r.options, (o) => optionOk(o)) || !isInt(r.picksLeft) || !['fight', 'treasure', 'event'].includes(r.source as string))) return 'bad';
  if (v.doors !== null && !isArr(v.doors, (d) => isObj(d) && DOORS.includes(d.kind as string))) return 'bad';
  const shop = v.shop;
  if (shop !== null && (!isObj(shop) || !isArr(shop.slots, (s) => optionOk(s, true) && isObj(s) && isNum(s.price) && isBool(s.sold)))) return 'bad';
  const ev = v.event;
  if (ev !== null) {
    if (!isObj(ev) || !isStr(ev.eventId) || !(ev.chosen === null || isInt(ev.chosen))) return 'bad';
    if (!db.events.has(ev.eventId)) stale = true;
  }
  if (v.rest !== null && (!isObj(v.rest) || !isBool(v.rest.used))) return 'bad';
  const need: Record<string, unknown> = { fight: f, reward: r, doors: v.doors, rest: v.rest, shop, event: ev };
  if ((v.phase as string) in need && need[v.phase as string] === null) return 'bad';
  return stale ? 'stale' : 'ok';
}

/**
 * Parses, migrates and validates a save. Throws SaveError on anything unusable.
 * A well-formed run that refers to content that no longer exists is dropped (progress is kept).
 */
export function load(db: Db, text: string, migrations: Migration[] = MIGRATIONS): SaveFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail('not valid JSON');
  }
  if (!isObj(raw) || raw.app !== 'pip-and-blade') fail('not a Pip & Blade save');
  let cur: Obj;
  try {
    cur = runMigrations(raw, SAVE_VERSION, migrations);
  } catch (e) {
    fail(e instanceof Error ? e.message : 'migration failed');
  }
  const game = cur.game;
  if (!isObj(game)) fail('game missing');
  const profile = loadProfile(db, game.profile);
  let run: RunState | null = null;
  if (game.run !== null && game.run !== undefined) {
    const verdict = checkRun(db, game.run);
    if (verdict === 'bad') fail('run data is damaged');
    if (verdict === 'ok') run = game.run as RunState;
  }
  const settings = isObj(cur.settings) ? cur.settings : {};
  const out: GameState = { profile, run };
  return { app: 'pip-and-blade', version: SAVE_VERSION, game: out, settings: { reduceMotion: settings.reduceMotion === true } };
}
