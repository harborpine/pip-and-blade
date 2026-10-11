/** Info sheets: exact rules text for dice, heroes, enemies, intents, items and keywords. */
import type { DieView, ItemId } from '@shared';
import { spriteImg } from './art';
import { h } from './dom';
import { content } from './engine';
import { faceGrid, itemRows } from './parts';
import { game } from './store';
import { infoSheet } from './ui';
import { describeIntent, EFFECT_NAME, EFFECT_TEXT, enemyDef, enemyOf, enemySpriteId, heroDef, heroName, heroSpriteId, itemDef, keywordDef, keywordText, statusDef } from './view';

const section = (title: string): HTMLElement => h('h3', { class: 'sheet-sub', text: title });
const kwLines = (ids: string[]): (string | Node)[] => ids.map((k) => h('p', { class: 'kw-line' }, h('strong', { text: `${keywordDef(k)?.name ?? k}: ` }), keywordText(k)));

export function showItemInfo(id: ItemId | string): void {
  const d = itemDef(id);
  infoSheet({
    testid: 'info-item',
    title: d?.name ?? id,
    icon: spriteImg(`item.${id}`, 2),
    lines: [d ? `${d.rarity[0]?.toUpperCase()}${d.rarity.slice(1)} item.` : '', d?.text ?? ''].filter(Boolean),
  });
}

export function showKeywordInfo(id: string): void {
  infoSheet({ testid: 'info-keyword', title: keywordDef(id)?.name ?? id, icon: spriteImg(`kw.${id}`, 2), lines: [keywordText(id)] });
}

export function showDieInfo(dv: DieView): void {
  const run = game().run;
  const hero = run?.heroes[dv.hero];
  const face = hero?.faces[dv.faceIndex];
  const lines: (string | Node)[] = [];
  const what = dv.effect === 'blank' ? 'Blank: does nothing.' : `${EFFECT_NAME[dv.effect]} ${dv.value} right now. ${EFFECT_TEXT[dv.effect]}`;
  lines.push(what);
  if (dv.cursed) lines.push('Cursed: this face is blank for the rest of the fight.');
  if (dv.jammed) lines.push('Jammed by an enemy: it cannot be rerolled this turn.');
  if (dv.locked) lines.push('Locked: it keeps this face when you reroll.');
  if (dv.symbol) lines.push(`Symbol: ${dv.symbol}. Matching symbols across your dice form sets.`);
  if (dv.echoOf !== null) lines.push('Echo: copying the neighbouring die.');
  if (face && face.upgrades > 0) lines.push(`Upgraded ${face.upgrades} time${face.upgrades === 1 ? '' : 's'}.`);
  lines.push(...kwLines(dv.keywords));
  infoSheet({
    testid: 'info-die',
    title: `${face?.name ?? 'Die'} (${hero ? heroName(hero.heroId) : ''})`,
    icon: spriteImg(dv.symbol ? `sym.${dv.symbol}` : `fx.${dv.effect}`, 2),
    lines,
  });
}

export function showHeroInfo(index: number): void {
  const run = game().run;
  const hs = run?.heroes[index];
  if (!run || !hs) return;
  const d = heroDef(hs.heroId);
  const hf = run.fight?.heroes[index];
  const lines: (string | Node)[] = [`${d?.title ?? ''}. ${d?.blurb ?? ''}`, `HP ${hs.downed ? 0 : hs.hp} of ${hs.maxHp}${hs.downed ? ' (down this fight)' : ''}.`];
  if (hf && (hf.shield > 0 || hf.ward > 0)) lines.push(`Shield ${hf.shield}${hf.ward ? `, Ward ${hf.ward} (does not expire)` : ''}.`);
  if (hf) for (const [s, n] of Object.entries(hf.statuses)) if (n) lines.push(`${statusDef(s)?.name ?? s} ${n}: ${statusDef(s)?.text ?? ''}`);
  lines.push(section('Die faces'), faceGrid(hs.faces), section('Items'));
  if (hs.items.length === 0) lines.push('No items.');
  else lines.push(...itemRows(hs.items));
  infoSheet({ testid: 'info-hero', title: heroName(hs.heroId), icon: spriteImg(heroSpriteId(hs.heroId), 1), lines });
}

export function showEnemyInfo(uid: number): void {
  const run = game().run;
  const es = run ? enemyOf(run, uid) : undefined;
  if (!run || !es) return;
  const d = enemyDef(es.enemyId);
  const lines: (string | Node)[] = [d?.blurb ?? '', `HP ${es.hp} of ${es.maxHp}.`];
  if (es.shield > 0) lines.push(`Shield ${es.shield}.`);
  for (const [s, n] of Object.entries(es.statuses)) if (n) lines.push(`${statusDef(s)?.name ?? s} ${n}: ${statusDef(s)?.text ?? ''}`);
  if (d?.passiveText) lines.push(section(d.kind === 'boss' ? 'Boss mechanic' : 'Passive'), d.passiveText);
  if (es.intent) lines.push(section(`Next: ${es.intent.moveName}`), ...describeIntent(run, es.intent));
  infoSheet({ testid: 'info-enemy', title: d?.name ?? es.enemyId, icon: spriteImg(enemySpriteId(es.enemyId), 1), lines });
}

export function showIntentInfo(uid: number): void {
  const run = game().run;
  const es = run ? enemyOf(run, uid) : undefined;
  if (!run || !es || !es.intent) return;
  const d = enemyDef(es.enemyId);
  infoSheet({
    testid: 'info-intent',
    title: `${d?.name ?? ''}: ${es.intent.moveName}`,
    icon: spriteImg('ui.info', 2),
    lines: [...describeIntent(run, es.intent), 'Exact numbers: this is what happens when you end your turn (before your shields and the forecast on your heroes).'],
  });
}

export function showSetInfo(kind: string, symbol: string | null): void {
  const set = content.sets.find((s) => s.kind === kind && s.symbol === (symbol ?? undefined)) ?? content.sets.find((s) => s.kind === kind && !s.symbol);
  infoSheet({ testid: 'info-set', title: set?.name ?? kind, icon: spriteImg(`set.${kind}`, 2), lines: [set?.text ?? ''] });
}

/** Info for a hero from content (hero select, collection): faces, HP, slots. Locked heroes are a mystery. */
export function showHeroDefInfo(id: string, known = true): void {
  const d = heroDef(id);
  if (!d) return;
  if (!known) {
    const feat = content.feats.find((x) => x.unlocks?.heroes?.includes(id as never));
    infoSheet({ testid: 'info-hero-locked', title: '???', icon: spriteImg('ui.unknown', 2), lines: feat ? [`Locked. Feat: ${feat.name}`, feat.text] : ['Not unlocked yet. Complete its feat to meet this hero.'] });
    return;
  }
  const lines: (string | Node)[] = [`${d.title}. ${d.blurb}`, `HP ${d.maxHp}. ${d.itemSlots} item slots.`, section('Die faces')];
  lines.push(faceGrid(d.faces.map((f) => ({ defId: f.id, name: f.name, effect: f.effect, symbol: f.symbol, value: f.value, keywords: f.keywords, upgrades: 0 }))));
  infoSheet({ testid: 'info-hero-def', title: d.name, icon: spriteImg(heroSpriteId(d.id), 1), lines });
}

/** Info for an enemy from content (collection): HP, passive, moves. */
export function showEnemyDefInfo(id: string): void {
  const d = enemyDef(id);
  if (!d) return;
  const lines: (string | Node)[] = [d.blurb, `${d.kind === 'boss' ? 'Boss' : d.kind === 'elite' ? 'Elite' : 'Enemy'} of act ${d.act}. HP ${d.hp}.`];
  if (d.passiveText) lines.push(section(d.kind === 'boss' ? 'Boss mechanic' : 'Passive'), d.passiveText);
  infoSheet({ testid: 'info-enemy-def', title: d.name, icon: spriteImg(enemySpriteId(d.id), 1), lines });
}

/** The exact anti-stall rule, from the numbers in content. */
export function showFuryInfo(): void {
  const fury = content.rules.fury;
  if (!fury) return;
  infoSheet({
    testid: 'info-fury',
    title: 'Fury',
    icon: spriteImg('status.strength', 2),
    lines: [
      `From turn ${fury.fromTurn} of a fight, every enemy gains ${fury.strengthPerTurn} Strength at the start of every enemy turn, for the rest of the fight.`,
      'Strength makes all of its attacks hit harder for the rest of the fight. It stops fights from dragging on forever: finish them before it builds up.',
    ],
  });
}
