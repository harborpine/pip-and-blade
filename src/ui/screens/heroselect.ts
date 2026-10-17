import type { HeroId } from '@shared';
import { icon, token } from '../art';
import { h, replace } from '../dom';
import { scrollBox } from '../scroll';
import { content, engine } from '../engine';
import { showHeroDefInfo } from '../info';
import { dispatch, game, go } from '../store';
import { toast, topBar, onLongPress } from '../ui';
import { randomSeed } from '../view';
import { tutorialReset } from '../tutorial';
import type { Screen } from './types';

let picked: HeroId[] = [];

function unlockHint(id: string): string {
  const feat = content.feats.find((f) => f.unlocks?.heroes?.includes(id as HeroId));
  return feat ? `Feat: ${feat.name}. ${feat.text}` : 'Locked';
}

export function buildHeroSelect(): Screen {
  const profile = game().profile;
  const unlocked = new Set<string>(profile.unlockedHeroes);
  const size = content.rules.partySize;
  picked = picked.filter((p) => unlocked.has(p));
  if (picked.length === 0) picked = content.heroes.filter((x) => unlocked.has(x.id)).slice(0, size).map((x) => x.id);
  let tier = Math.min(tierChoice, profile.maxTier);

  const el = h('main', { class: 'screen heroselect', testid: 'screen-heroselect' });

  function paint(): void {
    replace(el,
      topBar('Choose your party', () => go('home')),
      h('p', { class: 'hint center', testid: 'party-count', text: `Pick ${size} heroes (${picked.length}/${size})` }),
      scrollBox('heroselect', { class: 'hero-grid' },
        ...content.heroes.map((d) => {
          const open = unlocked.has(d.id);
          const on = picked.includes(d.id);
          const card = h('div', { class: `hero-card${on ? ' picked' : ''}${open ? '' : ' locked'}`, testid: `hero-pick-${d.id}`, attrs: { role: 'button', tabindex: '0', 'aria-pressed': String(on) } },
            h('div', { class: 'hero-card-art' }, token(`hero.${d.id}`, 72)),
            h('strong', { text: d.name }),
            h('span', { class: 'hint', text: open ? `${d.title} · HP ${d.maxHp}` : unlockHint(d.id) }),
            on ? h('span', { class: 'picked-mark', text: `#${picked.indexOf(d.id) + 1}` }) : null,
            h('span', { class: 'info-btn', testid: `hero-info-${d.id}`, attrs: { role: 'button', 'aria-label': `About ${d.name}` } }, icon('ui.info', 24)),
          );
          card.querySelector('.info-btn')?.addEventListener('click', (ev) => {
            ev.stopPropagation();
            showHeroDefInfo(d.id, open);
          });
          card.addEventListener('click', () => {
            if (!open) {
              toast(unlockHint(d.id));
              return;
            }
            if (on) picked = picked.filter((x) => x !== d.id);
            else if (picked.length < size) picked = [...picked, d.id];
            else toast(`Your party is full: tap a picked hero to remove them.`);
            paint();
          });
          onLongPress(card, () => showHeroDefInfo(d.id, open));
          return card;
        }),
      ),
      profile.maxTier > 0
        ? h('div', { class: 'tier-row', testid: 'tier-picker' },
            h('span', { class: 'hint', text: 'Difficulty' }),
            ...Array.from({ length: profile.maxTier + 1 }, (_, t) =>
              h('button', {
                class: `btn tier-btn${tier === t ? ' primary' : ''}`,
                testid: `tier-${t}`,
                text: t === 0 ? 'Base' : `T${t}`,
                onClick: () => {
                  tier = t;
                  tierChoice = t;
                  paint();
                },
              }),
            ),
          )
        : null,
      profile.maxTier > 0 && tier > 0 ? h('p', { class: 'hint center', testid: 'tier-text', text: content.tiers.find((x) => x.tier === tier)?.text ?? '' }) : null,
      h('button', {
        class: 'btn primary big',
        testid: 'btn-start-run',
        text: 'Start run',
        disabled: picked.length !== size,
        onClick: () => {
          if (picked.length !== size) return;
          const heroes = picked.slice(0, 3) as [HeroId, HeroId, HeroId];
          tutorialReset();
          try {
            dispatch({ type: 'startRun', heroes, tier, seed: randomSeed() });
            go('home');
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not start.');
          }
        },
      }),
    );
  }
  paint();
  void engine;
  return { el };
}

let tierChoice = 0;
