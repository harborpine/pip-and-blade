/** Reusable pieces shared by the between-fight screens. */
import type { FaceState, HeroState, RunState } from '@shared';
import { icon, picture, portrait } from './art';
import { h } from './dom';
import { content } from './engine';
import { showHeroInfo, showItemInfo } from './info';
import { chooseSheet, onLongPress } from './ui';
import type { ChoiceItem } from './ui';
import { effectIcon, faceLine, heroName, heroSpriteId, itemDef, itemName, shortName, symbolIcon } from './view';

export function goldPill(run: RunState): HTMLElement {
  return h('span', { class: 'gold', testid: 'gold' }, icon('ui.gold', 18), h('b', { class: 'pxn', text: String(run.gold) }));
}

/** Compact row of the three heroes with HP. Long-press for the full info sheet. */
export function partyStrip(run: RunState, compact = false): HTMLElement {
  return h('div', { class: `party-strip${compact ? ' compact' : ''}`, testid: 'party-strip' },
    ...run.heroes.map((hs, i) => {
      const el = h('div', { class: `mini-hero${hs.downed ? ' downed' : ''}`, testid: `party-${i}` },
        compact ? null : h('div', { class: 'mini-art' }, portrait(heroSpriteId(hs.heroId))),
        h('strong', { text: shortName(hs.heroId) }),
        h('span', { class: 'hint', text: `${hs.hp}/${hs.maxHp} HP` }),
        h('div', { class: 'mini-items' }, ...hs.items.map((it) => {
          const b = h('span', { class: 'mini-item' }, icon(`item.${it}`, 24));
          b.addEventListener('click', () => showItemInfo(it));
          return b;
        })),
      );
      onLongPress(el, () => showHeroInfo(i));
      el.addEventListener('click', () => showHeroInfo(i));
      return el;
    }),
  );
}

/** A little die-face card: icon, value, symbol, keywords, name. */
export function faceCard(f: FaceState, extra = ''): HTMLElement {
  const faceIcon = f.effect === 'blank' && f.symbol ? symbolIcon(f.symbol) : effectIcon(f.effect);
  return h('div', { class: `face-card ${extra}` },
    h('div', { class: `face-art${f.effect === 'blank' ? ' blank' : ''}` },
      f.effect === 'blank' ? icon('die.blank', 36) : icon(faceIcon, 36),
      f.effect === 'blank' ? h('b', { class: 'word', text: 'Blank' }) : h('b', { class: 'pxn', text: String(f.value) }),
      // The symbol badge stands beside the number, never on it.
      f.symbol && f.effect !== 'blank' ? icon(symbolIcon(f.symbol), 18, 'face-sym') : null,
    ),
    f.keywords.length > 0 ? h('div', { class: 'face-kws' }, ...f.keywords.map((k) => icon(`kw.${k}`, 18))) : null,
    h('span', { class: 'face-name', text: extra.includes('compact') ? f.name : faceLine(f) }),
    f.upgrades > 0 ? h('span', { class: 'face-up', text: `+${f.upgrades}` }) : null,
  );
}

const upgradeCap = (): number => content.rules.maxUpgradesPerFace;

/** Choose a face of a hero (to replace or upgrade). Resolves with the face index or null. */
export async function chooseFace(hero: HeroState, opts: { title: string; hint?: string; onlyUpgradable?: boolean; upgradeAmount?: number; testid: string }): Promise<number | null> {
  const items: ChoiceItem[] = hero.faces.map((f, i) => ({
    label: faceLine(f),
    sub: `${opts.upgradeAmount && f.effect !== 'blank' ? `Becomes ${f.value + opts.upgradeAmount}. ` : ''}${f.upgrades > 0 ? `Upgraded ${f.upgrades}/${upgradeCap()}` : ''}`.trim() || undefined,
    icon: faceCard(f, 'compact'),
    testid: `face-slot-${i}`,
    disabled: !!opts.onlyUpgradable && f.upgrades >= upgradeCap(),
  }));
  return chooseSheet({ testid: opts.testid, title: opts.title, hint: opts.hint, items });
}

/** Choose a hero. Resolves with the hero index or null. */
export async function chooseHero(run: RunState, opts: { title: string; hint?: string; testid: string; filter?: (h: HeroState) => boolean }): Promise<number | null> {
  const items: ChoiceItem[] = run.heroes.map((hs, i) => ({
    label: heroName(hs.heroId),
    sub: `${hs.hp}/${hs.maxHp} HP${hs.items.length ? ` \u00b7 ${hs.items.map(itemName).join(', ')}` : ''}`,
    icon: portrait(heroSpriteId(hs.heroId)),
    testid: `place-hero-${i}`,
    disabled: opts.filter ? !opts.filter(hs) : false,
  }));
  return chooseSheet({ testid: opts.testid, title: opts.title, hint: opts.hint, items });
}

/** Choose who gets an item and, if their slots are full, which item to replace. null = cancelled. */
export async function chooseItemPlacement(run: RunState, itemId: string): Promise<{ hero: number; replaceItem?: number } | null> {
  const hero = await chooseHero(run, { title: 'Who carries it?', hint: `${itemName(itemId)}: ${itemDef(itemId)?.text ?? ''}`, testid: 'choose-hero' });
  if (hero === null) return null;
  const hs = run.heroes[hero];
  const slots = content.heroes.find((d) => d.id === hs?.heroId)?.itemSlots ?? 2;
  if (!hs || hs.items.length < slots) return { hero };
  const k = await chooseSheet({
    testid: 'choose-replace-item',
    title: 'No free slot',
    hint: `${shortName(hs.heroId)} must swap an item for it. The old item is lost.`,
    items: hs.items.map((it, n) => ({ label: itemName(it), sub: itemDef(it)?.text, icon: picture(`item.${it}`, false), testid: `replace-item-${n}` })),
  });
  return k === null ? null : { hero, replaceItem: k };
}

/** All of a hero's faces as a 3x2 grid of face cards. */
export function faceGrid(faces: FaceState[]): HTMLElement {
  return h('div', { class: 'face-grid', testid: 'face-grid' }, ...faces.map((f) => faceCard(f, 'compact')));
}

/** Item rows (icon, name, exact text) for info sheets. */
export function itemRows(ids: string[]): HTMLElement[] {
  return ids.map((id) => {
    const row = h('button', { class: 'item-row', testid: `item-row-${id}`, attrs: { 'data-item': id } }, picture(`item.${id}`, false), h('span', {}, h('strong', { text: itemName(id) }), h('small', { text: itemDef(id)?.text ?? '' })));
    row.addEventListener('click', () => showItemInfo(id));
    return row;
  });
}

/** One-line face: icon, value, keyword badges. For tight lists such as the shop. */
export function faceInline(f: FaceState): HTMLElement {
  return h('span', { class: 'face-inline' },
    f.effect === 'blank' ? icon('die.blank', 24) : icon(effectIcon(f.effect), 24),
    f.effect === 'blank' ? null : h('b', { class: 'pxn', text: String(f.value) }),
    ...f.keywords.map((k) => icon(`kw.${k}`, 18)),
  );
}
