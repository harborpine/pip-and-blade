/** Lookups and plain-text descriptions built from content and state. No game maths here: numbers come from the engine. */
import type { EnemyDef, EnemyState, FaceEffect, FaceState, HeroDef, HeroId, Intent, ItemDef, ItemId, KeywordDef, KeywordId, ResolvedEnemyAction, RunState, StatusDef, StatusId, SymbolId } from '@shared';
import { content } from './engine';

const byId = <T extends { id: string }>(list: T[]): Map<string, T> => new Map(list.map((x) => [x.id, x]));
const heroes = byId(content.heroes);
const enemies = byId(content.enemies);
const items = byId(content.items);
const keywords = byId(content.keywords);
const statuses = byId(content.statuses);

export const heroDef = (id: HeroId | string): HeroDef | undefined => heroes.get(id);
export const enemyDef = (id: string): EnemyDef | undefined => enemies.get(id);
export const itemDef = (id: ItemId | string): ItemDef | undefined => items.get(id);
export const keywordDef = (id: KeywordId | string): KeywordDef | undefined => keywords.get(id);
export const statusDef = (id: StatusId | string): StatusDef | undefined => statuses.get(id);

export const heroName = (id: string): string => heroDef(id)?.name ?? id;
export const shortName = (id: string): string => (heroDef(id)?.name ?? id).split(' ')[0] ?? id;
export const enemyName = (id: string): string => enemyDef(id)?.name ?? id;
export const itemName = (id: string): string => itemDef(id)?.name ?? id;

export const enemySpriteId = (enemyId: string): string => (enemyDef(enemyId)?.kind === 'boss' ? `boss.${enemyId}` : `enemy.${enemyId}`);
export const heroSpriteId = (id: string): string => `hero.${id}`;

/** The icon that says what a face does. */
export const effectIcon = (effect: FaceEffect): string => `fx.${effect}`;
export const symbolIcon = (s: SymbolId): string => `sym.${s}`;

export const EFFECT_NAME: Record<FaceEffect, string> = {
  damage: 'Damage',
  shield: 'Shield',
  heal: 'Heal',
  weaken: 'Weaken',
  focus: 'Focus',
  blank: 'Blank',
};

export const EFFECT_TEXT: Record<FaceEffect, string> = {
  damage: 'Deals damage to an enemy.',
  shield: 'Gives a hero shield, which absorbs damage until your next turn.',
  heal: 'Restores a hero’s HP.',
  weaken: 'Reduces each hit of an enemy’s attacks this turn.',
  focus: 'Gives extra rerolls next turn.',
  blank: 'Does nothing.',
};

export function keywordText(id: string): string {
  const k = keywordDef(id);
  if (!k) return id;
  return k.text.replace(/\{n\}/g, String(k.param));
}

export function faceLine(f: FaceState): string {
  const kw = f.keywords.map((k) => keywordDef(k)?.name ?? k).join(', ');
  const base = f.effect === 'blank' ? 'Blank' : `${EFFECT_NAME[f.effect]} ${f.value}`;
  return `${f.name}: ${base}${kw ? ` (${kw})` : ''}`;
}

export function actionIconId(a: ResolvedEnemyAction): string {
  switch (a.type) {
    case 'attack':
      return a.heroes.length > 1 ? 'intent.attack_all' : 'intent.attack';
    case 'shield':
      return 'intent.shield';
    case 'heal':
      return 'intent.heal';
    case 'status':
      return a.heroes.length > 0 ? 'intent.debuff' : 'intent.buff';
    case 'lockDie':
      return 'intent.lockDie';
    case 'curseFace':
      return 'intent.curseFace';
    case 'stealReroll':
      return 'intent.stealReroll';
    case 'summon':
      return 'intent.summon';
    case 'charge':
      return 'intent.charge';
  }
}

function heroList(run: RunState, idx: number[]): string {
  if (idx.length === 0) return '';
  if (idx.length >= run.heroes.filter((h) => !h.downed).length && idx.length > 1) return 'all heroes';
  return idx.map((i) => shortName(run.heroes[i]?.heroId ?? '')).join(' & ');
}

/** Short badge text next to the intent icon, e.g. "6" or "3x2". */
export function actionBadge(a: ResolvedEnemyAction): string {
  switch (a.type) {
    case 'attack':
      return a.hits > 1 ? `${a.amount}x${a.hits}` : `${a.amount}`;
    case 'shield':
    case 'heal':
      return `${a.amount}`;
    case 'status':
      return `${a.amount}`;
    case 'stealReroll':
      return `-${a.amount}`;
    case 'summon':
    case 'lockDie':
    case 'curseFace':
    case 'charge':
      return '';
  }
}

/** Plain-English, exact description of one resolved enemy action. */
export function describeAction(run: RunState, a: ResolvedEnemyAction): string {
  const who = heroList(run, a.heroes);
  switch (a.type) {
    case 'attack': {
      const hits = a.hits > 1 ? `${a.amount} damage ${a.hits} times` : `${a.amount} damage`;
      const extra = `${a.pierce ? ', ignoring shield' : ''}${a.poison ? `, and poisons ${a.poison}` : ''}`;
      return `Hits ${who || 'a hero'} for ${hits}${extra}.`;
    }
    case 'shield':
      return `Gains ${a.amount} shield${a.enemies.length > 1 ? ' (and its allies)' : ''}.`;
    case 'heal':
      return `Heals ${a.amount} HP.`;
    case 'status': {
      const name = a.status ? (statusDef(a.status)?.name ?? a.status) : 'a status';
      return a.heroes.length > 0 ? `Gives ${who} ${a.amount} ${name}.` : `Gains ${a.amount} ${name}.`;
    }
    case 'lockDie':
      return `Jams ${who || 'a hero'}’s die next turn: it rolls once and cannot be rerolled.`;
    case 'curseFace': {
      const faces = a.heroes.map((hi, k) => {
        const hero = run.heroes[hi];
        const fi = a.faces[k];
        const face = hero && fi !== undefined ? hero.faces[fi] : undefined;
        return `${shortName(hero?.heroId ?? '')}’s ${face ? `"${face.name}"` : 'face'}`;
      });
      return `Curses ${faces.join(', ')} to blank for the rest of the fight.`;
    }
    case 'stealReroll':
      return `Steals ${a.amount} reroll${a.amount === 1 ? '' : 's'} next turn.`;
    case 'summon':
      return `Summons ${a.summon ? enemyName(a.summon) : 'an ally'}.`;
    case 'charge':
      return 'Is charging up. It does nothing this turn.';
  }
}

export function describeIntent(run: RunState, intent: Intent): string[] {
  return intent.actions.map((a) => describeAction(run, a));
}

export function statusText(statusId: string, stacks: number): string {
  const d = statusDef(statusId);
  return `${d?.name ?? statusId} ${stacks}: ${d?.text ?? ''}`.trim();
}

export function enemyOf(run: RunState, uid: number): EnemyState | undefined {
  return run.fight?.enemies.find((e) => e.uid === uid);
}

/** Random run seed. The engine cannot read a clock, so the UI supplies entropy. */
export function randomSeed(): string {
  const a = new Uint32Array(3);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => n.toString(36)).join('-');
}

function targetWords(run: RunState, a: ResolvedEnemyAction): string {
  if (a.heroes.length === 0) return '';
  const living = run.heroes.filter((h) => !h.downed).length;
  if (a.heroes.length > 1 && a.heroes.length >= living) return 'all';
  return a.heroes.map((i) => shortName(run.heroes[i]?.heroId ?? '')).join(' & ');
}

/** One short, plain-words line for an intent action: "Attack 2 > Tamsin", "Summon Bramble Imp", "Charging". */
export function actionLine(run: RunState, a: ResolvedEnemyAction): string {
  const to = targetWords(run, a);
  const arrow = to ? ` \u2192 ${to}` : '';
  switch (a.type) {
    case 'attack':
      return `Attack ${a.hits > 1 ? `${a.amount}x${a.hits}` : a.amount}${a.pierce ? ' (pierce)' : ''}${arrow}`;
    case 'shield':
      return `Shield ${a.amount}${a.enemies.length > 1 ? ' (all)' : ''}`;
    case 'heal':
      return `Heal ${a.amount}`;
    case 'status': {
      const name = a.status ? (statusDef(a.status)?.name ?? a.status) : 'Status';
      const hint = a.heroes.length === 0 ? (a.status === 'thorns' ? ' (hitting it hurts you)' : a.status === 'strength' ? ' (hits harder)' : '') : '';
      return `${name} ${a.heroes.length > 0 ? '' : '+'}${a.amount}${hint}${arrow}`;
    }
    case 'lockDie':
      return `Lock die${arrow}`;
    case 'curseFace': {
      const names = a.heroes.map((hi, k) => run.heroes[hi]?.faces[a.faces[k] ?? -1]?.name).filter(Boolean);
      return names.length > 0 ? `Curse ${names.join(', ')}${arrow}` : `Curse face${arrow}`;
    }
    case 'stealReroll':
      return `Steal ${a.amount} reroll${a.amount === 1 ? '' : 's'}`;
    case 'summon':
      return `Summon ${a.summon ? enemyName(a.summon) : 'ally'}`;
    case 'charge':
      return 'Charging';
  }
}
