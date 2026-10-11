/**
 * Content check (`npm run check:content`), part of `npm run verify`.
 * Verifies launch counts, that every entity has generated art, and that nothing references
 * something that does not exist. Owned by the lead. Never loosen a check to get a pass.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CONTENT } from '@content';
import type { ArtManifest, Condition, ContentDB, Effect, EnemyAi, FaceDef, TriggeredEffect } from '@shared';
import {
  APP_ICON_FILES, ASSET_IDS, ASSET_LIST, STRETCHY_KIT_IDS, BOSS_ROSTER, ENEMY_ROSTER, FACE_EFFECTS, HERO_ROSTER, ITEM_ROSTER, KEYWORDS, REQUIRED_COUNTS,
  STARTER_HEROES, STATUSES, SYMBOLS,
} from '@shared';

const root = fileURLToPath(new URL('..', import.meta.url));
const errors: string[] = [];
const fail = (msg: string): void => {
  errors.push(msg);
};
const c: ContentDB = CONTENT;

// ---------------------------------------------------------------- art manifest

let manifest: ArtManifest | null = null;
const manifestPath = `${root}src/art/generated/manifest.json`;
if (!existsSync(manifestPath)) {
  fail('Art manifest missing: src/art/generated/manifest.json (run "npm run art").');
} else {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ArtManifest;
}

const artMissing: string[] = [];
const hasArt = (assetId: string): boolean => {
  const info = manifest?.sprites[assetId];
  if (!info) return false;
  if (!existsSync(`${root}public/${info.file}`)) return false;
  return info.w > 0 && info.h > 0;
};
const needArt = (assetId: string): void => {
  if (!hasArt(assetId)) artMissing.push(assetId);
};
for (const id of ASSET_IDS) needArt(id);
for (const f of APP_ICON_FILES) if (!existsSync(`${root}public/icons/${f}`)) fail(`App icon file missing: public/icons/${f}`);
if (!existsSync(`${root}public/gallery.html`)) fail('Art gallery missing: public/gallery.html');
if (manifest && manifest.palette.length > 28) fail(`Palette has ${manifest.palette.length} colours; the shared palette must be about 24 (max 28).`);

// ---------------------------------------------------------------- one toy set (0.2.0)
// Every character and every icon must be a voxel model drawn by the isometric renderer:
// no flat icons anywhere. The generator sets `render` from the code path it really used.
const VOXEL_CATEGORIES: readonly string[] = ['hero', 'enemy', 'boss', 'sym', 'fx', 'kw', 'status', 'intent', 'door', 'set', 'ui', 'item', 'die', 'app'];
const MIN_ICON_PX = 32;
const ICON_CATEGORIES = ['sym', 'fx', 'kw', 'status', 'intent', 'set', 'ui', 'die', 'item', 'door'];
const flat: string[] = [];
const tooSmall: string[] = [];
const renderCount: Record<string, { voxel: number; total: number }> = {};
for (const a of ASSET_LIST) {
  const info = manifest?.sprites[a.id];
  if (!info) continue;
  const rc = (renderCount[a.category] ??= { voxel: 0, total: 0 });
  rc.total += 1;
  if (info.render === 'voxel') rc.voxel += 1;
  if (VOXEL_CATEGORIES.includes(a.category) && info.render !== 'voxel') flat.push(a.id);
  if (a.category === 'kit' && info.render !== 'kit') fail(`Kit piece ${a.id} is not marked render "kit".`);
  if (a.category === 'bg' && info.render !== 'scene') fail(`Background ${a.id} is not marked render "scene".`);
  if (ICON_CATEGORIES.includes(a.category) && VOXEL_CATEGORIES.includes(a.category) && Math.max(info.w, info.h) < MIN_ICON_PX) {
    tooSmall.push(`${a.id} (${info.w}x${info.h})`);
  }
}
if (flat.length > 0) fail(`Flat (non-voxel) sprites remain: ${flat.slice(0, 20).join(', ')}${flat.length > 20 ? ', ...' : ''}`);
if (tooSmall.length > 0) fail(`Icons under ${MIN_ICON_PX}px native: ${tooSmall.slice(0, 20).join(', ')}`);
for (const id of STRETCHY_KIT_IDS) {
  const sl = manifest?.sprites[id]?.slice;
  if (!sl || sl.length !== 4 || sl.some((n) => !Number.isInteger(n) || n < 0)) fail(`Stretchable kit piece ${id} has no valid 9-slice insets.`);
}
for (const f of ['font.json', 'palette.json', 'palette.css']) {
  if (!existsSync(`${root}src/art/generated/${f}`)) fail(`Generated art file missing: src/art/generated/${f}`);
}

// ---------------------------------------------------------------- helpers

const dupes = (ids: string[], what: string): void => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(`Duplicate ${what} id: ${id}`);
    seen.add(id);
  }
};
const sameSet = (actual: string[], expected: readonly string[], what: string): void => {
  for (const id of expected) if (!actual.includes(id)) fail(`${what}: roster id "${id}" has no content entry.`);
  for (const id of actual) if (!expected.includes(id)) fail(`${what}: content id "${id}" is not in the roster (src/shared/roster.ts).`);
};
const text = (s: string | undefined, where: string): void => {
  if (!s || s.trim().length === 0) fail(`Missing text: ${where}`);
};

const enemyIds = new Set(c.enemies.map((e) => e.id as string));
const itemIds = new Set(c.items.map((i) => i.id as string));
const heroIds = new Set(c.heroes.map((h) => h.id as string));

const checkFace = (f: FaceDef, where: string): void => {
  text(f.name, `${where} name`);
  if (!FACE_EFFECTS.includes(f.effect)) fail(`${where}: unknown effect ${String(f.effect)}`);
  if (f.effect === 'blank') {
    if (f.symbol !== null || f.value !== 0 || f.keywords.length > 0) fail(`${where}: blank faces must have no symbol, value 0 and no keywords.`);
  } else {
    if (f.symbol === null || !SYMBOLS.includes(f.symbol)) fail(`${where}: non-blank face needs a valid symbol.`);
    if (!Number.isInteger(f.value) || f.value < 0) fail(`${where}: value must be a whole number >= 0.`);
  }
  for (const k of f.keywords) if (!KEYWORDS.includes(k)) fail(`${where}: unknown keyword ${String(k)}`);
};

const checkCondition = (cond: Condition | undefined, where: string): void => {
  if (!cond) return;
  if (cond.type === 'all' || cond.type === 'any') cond.of.forEach((x) => checkCondition(x, where));
  if (cond.type === 'not') checkCondition(cond.of, where);
  if (cond.type === 'targetHasStatus' && !STATUSES.includes(cond.status)) fail(`${where}: unknown status in condition.`);
};
const checkEffect = (e: Effect, where: string): void => {
  if (e.type === 'summon' && !enemyIds.has(e.enemy)) fail(`${where}: summons unknown enemy "${e.enemy}".`);
  if (e.type === 'status' && !STATUSES.includes(e.status)) fail(`${where}: unknown status "${String(e.status)}".`);
};
const checkTriggers = (ts: TriggeredEffect[] | undefined, where: string): void => {
  for (const [i, t] of (ts ?? []).entries()) {
    if (t.effects.length === 0) fail(`${where} trigger ${i}: no effects.`);
    checkCondition(t.condition, `${where} trigger ${i}`);
    t.effects.forEach((e) => checkEffect(e, `${where} trigger ${i}`));
  }
};
const checkAi = (ai: EnemyAi, moveIds: Set<string>, where: string): void => {
  const ids = ai.type === 'cycle' ? ai.order : Object.keys(ai.weights);
  if (ids.length === 0) fail(`${where}: AI has no moves.`);
  for (const id of ids) if (!moveIds.has(id)) fail(`${where}: AI references unknown move "${id}".`);
};

// ---------------------------------------------------------------- heroes

dupes(c.heroes.map((h) => h.id), 'hero');
sameSet(c.heroes.map((h) => h.id), HERO_ROSTER.map((h) => h.id), 'Heroes');
for (const h of c.heroes) {
  text(h.name, `hero ${h.id} name`);
  text(h.blurb, `hero ${h.id} blurb`);
  if (h.faces.length !== 6) fail(`hero ${h.id}: needs exactly 6 faces, has ${h.faces.length}.`);
  h.faces.forEach((f, i) => checkFace(f, `hero ${h.id} face ${i}`));
  if (h.maxHp <= 0) fail(`hero ${h.id}: maxHp must be positive.`);
  if (h.itemSlots < 1) fail(`hero ${h.id}: needs at least 1 item slot.`);
  if (h.starter !== STARTER_HEROES.includes(h.id)) fail(`hero ${h.id}: starter flag disagrees with STARTER_HEROES.`);
  needArt(`hero.${h.id}`);
  needArt(`die.${h.id}`);
}
dupes([...c.heroes.flatMap((h) => h.faces.map((f) => f.id)), ...c.rewardFaces.map((f) => f.id)], 'face');
for (const f of c.rewardFaces) {
  checkFace(f, `reward face ${f.id}`);
  if (f.effect === 'blank') fail(`reward face ${f.id}: a reward cannot be a blank.`);
  if (f.heroes !== 'any') for (const h of f.heroes) if (!heroIds.has(h)) fail(`reward face ${f.id}: unknown hero "${h}".`);
}
for (const h of c.heroes) {
  const pool = c.rewardFaces.filter((f) => f.heroes === 'any' || f.heroes.includes(h.id));
  if (pool.length < 6) fail(`hero ${h.id}: only ${pool.length} reward faces available; needs at least 6 for varied offers.`);
}

// ---------------------------------------------------------------- items

dupes(c.items.map((i) => i.id), 'item');
sameSet(c.items.map((i) => i.id), ITEM_ROSTER.map((i) => i.id), 'Items');
for (const it of c.items) {
  text(it.name, `item ${it.id} name`);
  text(it.text, `item ${it.id} text`);
  if ((it.modifiers?.length ?? 0) + (it.triggers?.length ?? 0) === 0) fail(`item ${it.id}: does nothing (no modifiers or triggers).`);
  checkTriggers(it.triggers, `item ${it.id}`);
  needArt(`item.${it.id}`);
}

// ---------------------------------------------------------------- enemies and encounters

dupes(c.enemies.map((e) => e.id), 'enemy');
sameSet(c.enemies.map((e) => e.id), [...ENEMY_ROSTER.map((e) => e.id), ...BOSS_ROSTER.map((b) => b.id)], 'Enemies');
const bossIds = BOSS_ROSTER.map((b) => b.id as string);
for (const e of c.enemies) {
  const isBoss = bossIds.includes(e.id);
  if (isBoss !== (e.kind === 'boss')) fail(`enemy ${e.id}: kind "${e.kind}" disagrees with the boss roster.`);
  text(e.name, `enemy ${e.id} name`);
  text(e.blurb, `enemy ${e.id} blurb`);
  if (e.hp <= 0) fail(`enemy ${e.id}: hp must be positive.`);
  if (e.moves.length === 0) fail(`enemy ${e.id}: no moves.`);
  const moveIds = new Set(e.moves.map((m) => m.id));
  if (moveIds.size !== e.moves.length) fail(`enemy ${e.id}: duplicate move ids.`);
  checkAi(e.ai, moveIds, `enemy ${e.id}`);
  for (const p of e.phases ?? []) checkAi(p.ai, moveIds, `enemy ${e.id} phase <=${p.hpAtMostPct}%`);
  for (const m of e.moves) {
    text(m.name, `enemy ${e.id} move ${m.id} name`);
    if (m.actions.length === 0) fail(`enemy ${e.id} move ${m.id}: no actions.`);
    for (const a of m.actions) if (a.type === 'summon' && !enemyIds.has(a.enemy)) fail(`enemy ${e.id} move ${m.id}: summons unknown enemy "${a.enemy}".`);
  }
  checkTriggers(e.passives, `enemy ${e.id}`);
  if (((e.passives?.length ?? 0) > 0 || (e.phases?.length ?? 0) > 0 || e.kind === 'boss') && !e.passiveText?.trim()) {
    fail(`enemy ${e.id}: has a passive, phases or is a boss but no passiveText for the player.`);
  }
  needArt(`${isBoss ? 'boss' : 'enemy'}.${e.id}`);
}

const usesTrick = (id: string): boolean => {
  const e = c.enemies.find((x) => x.id === id);
  return !!e && e.moves.some((m) => m.actions.some((a) => a.type === 'lockDie' || a.type === 'curseFace' || a.type === 'stealReroll'));
};
dupes(c.encounters.map((e) => e.id), 'encounter');
const usedEnemies = new Set<string>();
for (const en of c.encounters) {
  if (en.enemies.length < 1 || en.enemies.length > c.rules.maxEnemies) fail(`encounter ${en.id}: needs 1..${c.rules.maxEnemies} enemies.`);
  for (const id of en.enemies) {
    if (!enemyIds.has(id)) fail(`encounter ${en.id}: unknown enemy "${id}".`);
    usedEnemies.add(id);
  }
  if (en.enemies.filter(usesTrick).length > 2) fail(`encounter ${en.id}: more than 2 dice-trick users (design rule 8).`);
  if (en.kind === 'normal' && (!en.slots || en.slots.length === 0)) fail(`encounter ${en.id}: normal encounters need slots.`);
  if (en.kind === 'boss' && !en.enemies.some((id) => bossIds.includes(id))) fail(`encounter ${en.id}: boss encounter without a boss.`);
  if (en.act === 1 && en.kind === 'normal' && en.slots?.includes(1) && en.enemies.some(usesTrick)) {
    fail(`encounter ${en.id}: Act 1 slot 1 must not contain dice-trick users.`);
  }
}
for (const act of [1, 2, 3] as const) {
  for (const slot of [1, 2, 3] as const) {
    const n = c.encounters.filter((e) => e.act === act && e.kind === 'normal' && e.slots?.includes(slot)).length;
    if (n < 2) fail(`Act ${act} slot ${slot}: needs at least 2 normal encounters for variety, has ${n}.`);
  }
  if (!c.encounters.some((e) => e.act === act && e.kind === 'elite')) fail(`Act ${act}: no elite encounter.`);
  if (c.encounters.filter((e) => e.act === act && e.kind === 'boss').length !== 1) fail(`Act ${act}: needs exactly one boss encounter.`);
}
for (const e of c.enemies) {
  const summoned = c.enemies.some((o) => o.moves.some((m) => m.actions.some((a) => a.type === 'summon' && a.enemy === e.id)));
  if (!usedEnemies.has(e.id) && !summoned) fail(`enemy ${e.id}: never appears in any encounter.`);
}
const trickKinds = new Set(c.enemies.flatMap((e) => e.moves.flatMap((m) => m.actions.map((a) => a.type))));
for (const t of ['lockDie', 'curseFace', 'stealReroll']) if (!trickKinds.has(t as never)) fail(`No enemy uses the "${t}" dice trick.`);

// ---------------------------------------------------------------- keywords, statuses, sets, doors

sameSet(c.keywords.map((k) => k.id), KEYWORDS, 'Keywords');
for (const k of c.keywords) {
  text(k.name, `keyword ${k.id} name`);
  text(k.text, `keyword ${k.id} text`);
  needArt(`kw.${k.id}`);
}
const usedKeywords = new Set([...c.heroes.flatMap((h) => h.faces), ...c.rewardFaces].flatMap((f) => f.keywords));
for (const k of KEYWORDS) if (!usedKeywords.has(k)) fail(`Keyword "${k}" is not on any hero or reward face.`);
sameSet(c.statuses.map((s) => s.id), STATUSES, 'Statuses');
for (const kind of ['pair', 'triple'] as const) {
  for (const s of SYMBOLS) {
    if (!c.sets.some((d) => d.kind === kind && (d.symbol === s || d.symbol === undefined))) fail(`Sets: no ${kind} rule covers symbol "${s}".`);
  }
}
if (!c.sets.some((d) => d.kind === 'rainbow')) fail('Sets: no rainbow rule.');
for (const d of c.sets) (d.burst ?? []).forEach((e) => checkEffect(e, `set ${d.kind}/${d.symbol ?? 'any'}`));
for (const kind of ['elite', 'rest', 'shop', 'event', 'treasure', 'onward'] as const) {
  if (!c.doors.some((d) => d.kind === kind)) fail(`Doors: no definition for "${kind}".`);
  needArt(`door.${kind}`);
}

// ---------------------------------------------------------------- events, tiers, feats, tutorial

dupes(c.events.map((e) => e.id), 'event');
for (const ev of c.events) {
  text(ev.name, `event ${ev.id} name`);
  text(ev.text, `event ${ev.id} text`);
  if (ev.choices.length < 2) fail(`event ${ev.id}: needs at least 2 choices.`);
  if (ev.acts.length === 0) fail(`event ${ev.id}: appears in no act.`);
  for (const [i, ch] of ev.choices.entries()) {
    text(ch.label, `event ${ev.id} choice ${i} label`);
    text(ch.text, `event ${ev.id} choice ${i} text`);
    text(ch.result, `event ${ev.id} choice ${i} result`);
    for (const o of ch.outcomes) if (o.type === 'item' && o.item && !itemIds.has(o.item)) fail(`event ${ev.id}: unknown item "${o.item}".`);
  }
  if (!ev.choices.some((ch) => !ch.costGold)) fail(`event ${ev.id}: needs at least one choice that costs no gold.`);
}
for (const act of [1, 2, 3] as const) {
  if (c.events.filter((e) => e.acts.includes(act)).length < 3) fail(`Act ${act}: needs at least 3 possible events.`);
}

if (c.tiers.length !== REQUIRED_COUNTS.tiers) fail(`Tiers: need exactly ${REQUIRED_COUNTS.tiers}, have ${c.tiers.length}.`);
c.tiers.forEach((t, i) => {
  if (t.tier !== i + 1) fail(`Tiers must be numbered 1..5 in order (found ${t.tier} at position ${i + 1}).`);
  text(t.name, `tier ${t.tier} name`);
  text(t.text, `tier ${t.tier} text`);
  if (t.modifiers.length === 0) fail(`tier ${t.tier}: no modifiers.`);
  for (const m of t.modifiers) if (m.type === 'enemyPassive') checkTriggers([m.passive], `tier ${t.tier}`);
});

dupes(c.feats.map((f) => f.id), 'feat');
const unlockedHeroesByFeats = new Set<string>();
const unlockedItemsByFeats = new Set<string>();
for (const f of c.feats) {
  text(f.name, `feat ${f.id} name`);
  text(f.text, `feat ${f.id} text`);
  if (f.tests.length === 0 && !f.heroes && f.minTier === undefined) fail(`feat ${f.id}: has no condition at all.`);
  for (const h of f.heroes ?? []) if (!heroIds.has(h)) fail(`feat ${f.id}: unknown hero "${h}".`);
  for (const h of f.unlocks?.heroes ?? []) {
    if (!heroIds.has(h)) fail(`feat ${f.id}: unlocks unknown hero "${h}".`);
    if (unlockedHeroesByFeats.has(h)) fail(`feat ${f.id}: hero "${h}" is unlocked by more than one feat.`);
    unlockedHeroesByFeats.add(h);
  }
  for (const it of f.unlocks?.items ?? []) {
    if (!itemIds.has(it)) fail(`feat ${f.id}: unlocks unknown item "${it}".`);
    unlockedItemsByFeats.add(it);
  }
}
for (const h of c.heroes) {
  if (!h.starter && !unlockedHeroesByFeats.has(h.id)) fail(`hero ${h.id}: not a starter and no feat unlocks it.`);
  if (h.starter && unlockedHeroesByFeats.has(h.id)) fail(`hero ${h.id}: starter hero should not be a feat unlock.`);
}
for (const it of c.items) {
  if (it.locked && !unlockedItemsByFeats.has(it.id)) fail(`item ${it.id}: locked but no feat unlocks it.`);
  if (!it.locked && unlockedItemsByFeats.has(it.id)) fail(`item ${it.id}: unlocked by a feat but not marked locked.`);
}
const grindy = c.feats.filter((f) => f.tests.length > 0 && f.tests.every((t) => t.stat === 'runsPlayed' || t.stat === 'runsWon')).length;
if (grindy > 3) fail(`Feats: ${grindy} are plain run counts; at most 3 allowed (no grinding).`);

for (const h of c.tutorial.heroes) if (!heroIds.has(h)) fail(`tutorial: unknown hero "${h}".`);
for (const id of c.tutorial.encounter.enemies) if (!enemyIds.has(id)) fail(`tutorial: unknown enemy "${id}".`);

// ---------------------------------------------------------------- counts

const count = {
  heroes: c.heroes.length,
  starterHeroes: c.heroes.filter((h) => h.starter).length,
  enemies: c.enemies.filter((e) => e.kind !== 'boss').length,
  bosses: c.enemies.filter((e) => e.kind === 'boss').length,
  items: c.items.length,
  lockedItems: c.items.filter((i) => i.locked).length,
  keywords: c.keywords.length,
  events: c.events.length,
  feats: c.feats.length,
  tiers: c.tiers.length,
  encounters: c.encounters.length,
  rewardFaces: c.rewardFaces.length,
};
const atLeast = (n: number, min: number, what: string): void => {
  if (n < min) fail(`Count: ${what} = ${n}, need at least ${min}.`);
};
atLeast(count.heroes, REQUIRED_COUNTS.heroes, 'heroes');
if (count.starterHeroes !== REQUIRED_COUNTS.starterHeroes) fail(`Count: starter heroes = ${count.starterHeroes}, need exactly ${REQUIRED_COUNTS.starterHeroes}.`);
atLeast(count.enemies, REQUIRED_COUNTS.enemies, 'enemies (not counting bosses)');
atLeast(count.bosses, REQUIRED_COUNTS.bosses, 'bosses');
atLeast(count.items, REQUIRED_COUNTS.items, 'items');
atLeast(count.keywords, REQUIRED_COUNTS.keywordsMin, 'keywords');
atLeast(count.events, REQUIRED_COUNTS.eventsMin, 'events');
atLeast(count.feats, REQUIRED_COUNTS.feats, 'feats');

// ---------------------------------------------------------------- report

const withArt = (ids: string[]): string => {
  const ok = ids.filter(hasArt).length;
  return `${ok}/${ids.length} with generated voxel art`;
};
console.log('Pip & Blade content check');
console.log('-------------------------');
console.log(`Heroes:     ${count.heroes} (${count.starterHeroes} starters, ${count.heroes - count.starterHeroes} unlockable)  ${withArt(c.heroes.map((h) => `hero.${h.id}`))}`);
console.log(`Enemies:    ${count.enemies}  ${withArt(c.enemies.filter((e) => e.kind !== 'boss').map((e) => `enemy.${e.id}`))}`);
console.log(`Bosses:     ${count.bosses}  ${withArt(c.enemies.filter((e) => e.kind === 'boss').map((e) => `boss.${e.id}`))}`);
console.log(`Items:      ${count.items} (${count.lockedItems} feat-unlocked)  ${withArt(c.items.map((i) => `item.${i.id}`))}`);
console.log(`Feats:      ${count.feats}`);
console.log(`Keywords:   ${count.keywords}  ${withArt(c.keywords.map((k) => `kw.${k.id}`))}`);
console.log(`Events:     ${count.events}`);
console.log(`Tiers:      ${count.tiers}`);
console.log(`Encounters: ${count.encounters}    Reward faces: ${count.rewardFaces}`);
const rc = (cats: string[]): string => {
  const v = cats.reduce((n, k) => n + (renderCount[k]?.voxel ?? 0), 0);
  const t = cats.reduce((n, k) => n + (renderCount[k]?.total ?? 0), 0);
  return `${v}/${t} voxel toy objects, ${t - v} flat`;
};
console.log(`Icons:      symbols ${rc(['sym'])}; face effects ${rc(['fx'])}; keywords ${rc(['kw'])}; statuses ${rc(['status'])}`);
console.log(`            intents ${rc(['intent'])}; doors ${rc(['door'])}; sets ${rc(['set'])}; interface ${rc(['ui'])}; items ${rc(['item'])}; dice ${rc(['die'])}`);
console.log(`Kit:        ${renderCount['kit']?.total ?? 0} interface-kit pieces (${STRETCHY_KIT_IDS.length} stretchable, all with 9-slice insets)    Backgrounds: ${renderCount['bg']?.total ?? 0}`);
console.log(`Asset list: ${ASSET_IDS.length} sprites required, ${ASSET_IDS.length - ASSET_IDS.filter((id) => !hasArt(id)).length} present, ${ASSET_IDS.filter((id) => !hasArt(id)).length} missing`);

const missing = [...new Set(artMissing)];
if (missing.length > 0) fail(`Missing art for ${missing.length} asset(s): ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ', ...' : ''}`);

if (errors.length > 0) {
  console.error(`\nContent check FAILED with ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nContent check passed: all counts met, no missing art, no missing references.');
