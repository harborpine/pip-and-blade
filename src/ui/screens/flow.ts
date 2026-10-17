/** Between-fight screens: reward, doors, rest, shop, event, victory, defeat. */
import type { Action, RewardOption, RunState } from '@shared';
import { IllegalActionError } from '@shared';
import { icon, picture, token } from '../art';
import { h, replace } from '../dom';
import { scrollBox } from '../scroll';
import { content } from '../engine';
import { showItemInfo } from '../info';
import { chooseFace, chooseHero, chooseItemPlacement, faceCard, faceInline, goldPill, partyStrip } from '../parts';
import { dispatch, game, go } from '../store';
import { onLongPress, toast } from '../ui';
import { faceLine, heroName, itemDef, itemName, shortName } from '../view';
import type { Screen } from './types';

function run(): RunState {
  const r = game().run;
  if (!r) throw new Error('No run in progress');
  return r;
}

function send(a: Action): boolean {
  try {
    dispatch(a);
    return true;
  } catch (e) {
    toast(e instanceof IllegalActionError ? e.message.replace(/^\w+: /, '') : 'That did not work.');
    return false;
  }
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function header(title: string, r: RunState, sub?: string): HTMLElement {
  return h('header', { class: 'flow-head' },
    h('div', { class: 'flow-title' }, h('h1', { text: title, testid: 'screen-title' }), sub ? h('p', { class: 'hint', text: sub, testid: 'screen-sub' }) : null),
    goldPill(r),
  );
}

// ------------------------------------------------------------ reward

function rewardCard(o: RewardOption, r: RunState, i: number, onPick: () => void): HTMLElement {
  // One compact row per reward (picture left, words right) so three rewards fit a browser-tab screen.
  let art: Node;
  let title: string;
  let line: string | null = null;
  let note: string;
  if (o.type === 'face') {
    art = faceCard(o.face, 'compact art-only', r.heroes[o.hero]?.heroId);
    title = `New face: ${shortName(r.heroes[o.hero]?.heroId ?? '')}`;
    line = faceLine(o.face);
    note = 'Replaces one of this hero’s faces.';
  } else if (o.type === 'upgrade') {
    art = h('div', { class: 'big-plus', text: `+${o.amount}` });
    title = 'Upgrade a face';
    note = `Pick one of ${heroName(r.heroes[o.hero]?.heroId ?? '')}’s faces to make stronger.`;
  } else {
    art = picture(`item.${o.item}`);
    title = itemName(o.item);
    note = itemDef(o.item)?.text ?? '';
  }
  const rarity = o.type === 'upgrade' ? 'common' : o.rarity;
  const card = h('button', { class: `reward-card rarity-${rarity}`, testid: `reward-option-${i}`, attrs: { 'data-type': o.type } },
    h('span', { class: 'reward-art' }, art),
    h('span', { class: 'reward-text' },
      h('span', { class: 'rarity-tag', text: o.type === 'upgrade' ? 'Upgrade' : cap(rarity) }),
      h('strong', { text: title }),
      line ? h('span', { class: 'reward-line', text: line }) : null,
      h('small', { text: note }),
    ),
  );
  card.addEventListener('click', onPick);
  if (o.type === 'item') onLongPress(card, () => showItemInfo(o.item));
  return card;
}

export function buildReward(): Screen {
  const r = run();
  const rw = r.reward;
  const el = h('main', { class: 'screen flow', testid: 'screen-reward' });
  if (!rw) return { el };
  el.append(
    header('Choose a reward', r, rw.picksLeft > 0 ? `${rw.picksLeft + 1} picks in a row` : rw.source === 'treasure' ? 'A free item' : 'Pick one'),
    scrollBox('reward', { class: 'reward-list' },
      ...rw.options.map((o, i) =>
        rewardCard(o, r, i, () => {
          void (async () => {
            const cur = run();
            if (o.type === 'item') {
              const pl = await chooseItemPlacement(cur, o.item);
              if (pl) send({ type: 'pickReward', option: i, hero: pl.hero, ...(pl.replaceItem !== undefined ? { replaceItem: pl.replaceItem } : {}) });
              return;
            }
            const hero = cur.heroes[o.hero];
            if (!hero) return;
            const face = await chooseFace(hero, {
              testid: 'choose-face',
              title: o.type === 'face' ? 'Replace which face?' : 'Upgrade which face?',
              hint: o.type === 'face' ? `${shortName(hero.heroId)} gets ${o.face.name}. The old face is lost.` : `${shortName(hero.heroId)}: the face you pick gets +${o.amount}.`,
              onlyUpgradable: o.type === 'upgrade',
              upgradeAmount: o.type === 'upgrade' ? o.amount : undefined,
            });
            if (face !== null) send({ type: 'pickReward', option: i, face });
          })();
        }),
      ),
    ),
    partyStrip(r),
    h('button', { class: 'btn plain', testid: 'btn-skip-reward', text: 'Skip', onClick: () => send({ type: 'skipReward' }) }),
  );
  return { el };
}

// ------------------------------------------------------------ doors

export function buildDoors(): Screen {
  const r = run();
  const doors = r.doors ?? [];
  const el = h('main', { class: 'screen flow', testid: 'screen-doors' },
    header('Choose a door', r, `Act ${r.act}, next: ${r.slot === 4 ? 'the boss' : `fight ${r.slot}`}`),
    scrollBox('doors', { class: 'door-row' },
      ...doors.map((d, i) => {
        const def = content.doors.find((x) => x.kind === d.kind);
        const b = h('button', { class: `door-card door-${d.kind}`, testid: `door-${i}`, attrs: { 'data-kind': d.kind } },
          picture(`door.${d.kind}`),
          h('span', { class: 'door-text' }, h('strong', { text: def?.name ?? d.kind }), h('small', { text: def?.text ?? '' })),
        );
        b.addEventListener('click', () => send({ type: 'pickDoor', door: i }));
        return b;
      }),
    ),
    partyStrip(r),
  );
  return { el };
}

// ------------------------------------------------------------ rest

export function buildRest(): Screen {
  const r = run();
  const used = r.rest?.used ?? false;
  const el = h('main', { class: 'screen flow', testid: 'screen-rest' },
    header('Campfire', r, used ? 'You rested.' : 'Heal the party or sharpen one face'),
    scrollBox('rest', { class: 'rest-mid' }, h('div', { class: 'rest-art' }, picture('door.rest')), partyStrip(r)),
    h('div', { class: 'flow-buttons' },
      !used
        ? h('button', { class: 'btn primary big', testid: 'btn-rest-heal', text: `Heal everyone ${content.rules.restHealPct}%`, onClick: () => send({ type: 'restHeal' }) })
        : null,
      !used
        ? h('button', {
            class: 'btn big',
            testid: 'btn-rest-upgrade',
            text: `Upgrade a face (+${content.rules.upgradeAmount})`,
            onClick: () => {
              void (async () => {
                const cur = run();
                const hi = await chooseHero(cur, { title: 'Whose face?', testid: 'choose-hero' });
                if (hi === null) return;
                const hero = cur.heroes[hi];
                if (!hero) return;
                const face = await chooseFace(hero, { testid: 'choose-face', title: 'Upgrade which face?', hint: `${shortName(hero.heroId)}: the face you pick gets +${content.rules.upgradeAmount}.`, onlyUpgradable: true, upgradeAmount: content.rules.upgradeAmount });
                if (face !== null) send({ type: 'restUpgrade', hero: hi, face });
              })();
            },
          })
        : null,
      h('button', { class: `btn ${used ? 'primary' : 'plain'} big`, testid: 'btn-leave', text: used ? 'Move on' : 'Skip resting', onClick: () => send({ type: 'leave' }) }),
    ),
  );
  return { el };
}

// ------------------------------------------------------------ shop

export function buildShop(): Screen {
  const r = run();
  const slots = r.shop?.slots ?? [];
  const el = h('main', { class: 'screen flow', testid: 'screen-shop' },
    header('Pedlar', r, 'Spend your gold'),
    scrollBox('shop', { class: 'shop-list' },
      ...slots.map((s, i) => {
        const afford = r.gold >= s.price;
        let pic: Node;
        let title: string;
        let text: string;
        if (s.type === 'item') {
          pic = picture(`item.${s.item}`, false);
          title = itemName(s.item);
          text = itemDef(s.item)?.text ?? '';
        } else if (s.type === 'face') {
          pic = faceInline(s.face);
          title = `Face for ${shortName(r.heroes[s.hero]?.heroId ?? '')}`;
          text = `${s.face.name}. Replaces one of their faces.`;
        } else if (s.type === 'upgrade') {
          pic = h('b', { class: 'plus-icon', text: `+${content.rules.upgradeAmount}` });
          title = 'Upgrade a face';
          text = 'Make any face stronger.';
        } else {
          pic = icon('ui.hp', 36);
          title = `Heal ${content.rules.shop.healPct}%`;
          text = 'Heals every hero.';
        }
        const b = h('button', { class: `shop-slot${s.sold ? ' sold' : ''}`, testid: `shop-slot-${i}`, disabled: s.sold || !afford, attrs: { 'data-type': s.type } },
          pic,
          h('span', { class: 'shop-text' }, h('strong', { text: title }), h('small', { text })),
          h('span', { class: 'price' }, s.sold ? null : icon('ui.gold', 18), h('b', { class: 'num', text: s.sold ? 'SOLD' : String(s.price) })),
        );
        b.addEventListener('click', () => {
          void (async () => {
            const cur = run();
            if (s.type === 'item') {
              const pl = await chooseItemPlacement(cur, s.item);
              if (pl) send({ type: 'shopBuy', slot: i, hero: pl.hero, ...(pl.replaceItem !== undefined ? { replaceItem: pl.replaceItem } : {}) });
            } else if (s.type === 'face') {
              const hero = cur.heroes[s.hero];
              if (!hero) return;
              const face = await chooseFace(hero, { testid: 'choose-face', title: 'Replace which face?', hint: `${shortName(hero.heroId)} gets ${s.face.name}. The old face is lost.` });
              if (face !== null) send({ type: 'shopBuy', slot: i, face });
            } else if (s.type === 'upgrade') {
              const hi = await chooseHero(cur, { title: 'Whose face?', testid: 'choose-hero' });
              if (hi === null) return;
              const hero = cur.heroes[hi];
              if (!hero) return;
              const face = await chooseFace(hero, { testid: 'choose-face', title: 'Upgrade which face?', hint: `${shortName(hero.heroId)}: the face you pick gets +${content.rules.upgradeAmount}.`, onlyUpgradable: true, upgradeAmount: content.rules.upgradeAmount });
              if (face !== null) send({ type: 'shopBuy', slot: i, hero: hi, face });
            } else {
              send({ type: 'shopBuy', slot: i });
            }
          })();
        });
        if (s.type === 'item') onLongPress(b, () => showItemInfo(s.item));
        return b;
      }),
    ),
    partyStrip(r, true),
    h('button', { class: 'btn primary big', testid: 'btn-leave', text: 'Leave', onClick: () => send({ type: 'leave' }) }),
  );
  return { el };
}

// ------------------------------------------------------------ event

export function buildEvent(): Screen {
  const r = run();
  const ev = r.event;
  const def = content.events.find((x) => x.id === ev?.eventId);
  const el = h('main', { class: 'screen flow', testid: 'screen-event' });
  if (!ev || !def) return { el };
  const chosen = ev.chosen !== null ? def.choices[ev.chosen] : undefined;
  replace(el,
    header(def.name, r),
    scrollBox('event', {},
      h('p', { class: 'event-text', testid: 'event-text', text: chosen ? chosen.result : def.text }),
      ...(chosen
        ? []
        : def.choices.map((c, i) => {
            const cost = c.costGold ?? 0;
            return h('button', { class: 'event-choice', testid: `event-choice-${i}`, disabled: cost > r.gold, onClick: () => send({ type: 'eventChoice', choice: i }) },
              h('strong', { text: c.label }),
              h('small', { text: c.text }),
              cost > 0 ? h('small', { class: 'cost', text: `Costs ${cost} gold${cost > r.gold ? ' (not enough)' : ''}` }) : null,
            );
          })),
    ),
    partyStrip(r),
    chosen || def.choices.every((c) => (c.costGold ?? 0) > r.gold)
      ? h('button', { class: 'btn primary big', testid: 'btn-leave', text: 'Continue', onClick: () => send({ type: 'leave' }) })
      : null,
  );
  return { el };
}

// ------------------------------------------------------------ victory / defeat

export function buildEnd(won: boolean): () => Screen {
  return () => {
    const r = run();
    const tutorial = r.mode === 'tutorial';
    const feats = r.featsEarned.map((id) => content.feats.find((f) => f.id === id)?.name ?? id);
    const profile = game().profile;
    const title = tutorial ? (won ? 'Tutorial complete!' : 'Tutorial over') : won ? 'Victory!' : 'Defeated';
    const lines: string[] = [];
    if (!tutorial) {
      lines.push(`Fights won: ${r.fightsWon}`);
      lines.push(`Reached act ${r.act}${r.slot === 4 ? ', the boss' : `, fight ${r.slot}`}`);
      lines.push(`Gold left: ${r.gold}`);
      if (r.mode === 'daily') lines.push(`Daily score: ${r.score}`);
      if (r.tier > 0) lines.push(`Tier ${r.tier}`);
    } else {
      lines.push(won ? 'You know the basics. Time for a real run.' : 'No worries: you can replay the tutorial from Settings.');
    }
    const el = h('main', { class: `screen flow end ${won ? 'won' : 'lost'}`, testid: won ? 'screen-victory' : 'screen-defeat' },
      h('div', { class: 'end-top' },
        h('h1', { class: 'end-title', testid: 'end-title', text: title }),
        won ? token('hero.' + (r.heroes[0]?.heroId ?? 'bulwark'), 96) : icon('ui.downed', 48, 'end-icon'),
      ),
      scrollBox(won ? 'victory' : 'defeat', { class: 'end-scroll' },
        partyStrip(r),
        h('div', { class: 'end-lines', testid: 'end-lines' }, ...lines.map((l) => h('p', { text: l }))),
        feats.length > 0 ? h('div', { class: 'end-feats', testid: 'end-feats' }, h('strong', { text: 'Feats earned' }), ...feats.map((f) => h('p', { text: f }))) : null,
        won && !tutorial && profile.maxTier > 0 && r.tier === profile.maxTier ? h('p', { class: 'hint', text: `Harder tiers are open: pick one when choosing your party.` }) : null,
      ),
      h('button', {
        class: 'btn primary big',
        testid: 'btn-continue',
        text: 'Continue',
        onClick: () => {
          if (send({ type: 'continue' })) go('home');
        },
      }),
    );
    return { el };
  };
}
