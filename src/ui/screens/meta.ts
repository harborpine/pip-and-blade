/** Collection, Feats, Stats, Daily. */
import { icon, portrait, spriteImg } from '../art';
import { h, replace } from '../dom';
import { scrollBox } from '../scroll';
import { content, engine } from '../engine';
import { showEnemyDefInfo, showHeroDefInfo, showItemInfo } from '../info';
import { dispatch, game, go, localDateKey } from '../store';
import { onLongPress, toast, topBar } from '../ui';
import { enemySpriteId, heroName, itemName, shortName } from '../view';
import type { Screen } from './types';

const back = (): void => go('home');

// ------------------------------------------------------------ collection

type Tab = 'heroes' | 'items' | 'enemies';
let tab: Tab = 'heroes';

function tile(testid: string, known: boolean, name: string, icon: Node, onTap: () => void): HTMLElement {
  const b = h('button', { class: `tile${known ? '' : ' unknown'}`, testid, attrs: { 'data-known': String(known) } },
    h('div', { class: 'tile-art' }, icon),
    h('span', { class: 'tile-name', text: known ? name : '???' }),
  );
  b.addEventListener('click', onTap);
  onLongPress(b, onTap);
  return b;
}

export function buildCollection(): Screen {
  const profile = game().profile;
  const el = h('main', { class: 'screen', testid: 'screen-collection' });
  const seenH = new Set<string>([...profile.seen.heroes, ...profile.unlockedHeroes]);
  const seenI = new Set<string>(profile.seen.items);
  const seenE = new Set<string>(profile.seen.enemies);

  function paint(): void {
    let tiles: HTMLElement[];
    let count: string;
    if (tab === 'heroes') {
      tiles = content.heroes.map((d) => tile(`coll-hero-${d.id}`, seenH.has(d.id), d.name, seenH.has(d.id) ? portrait(`hero.${d.id}`) : icon('ui.unknown', 48), () => showHeroDefInfo(d.id, seenH.has(d.id))));
      count = `${content.heroes.filter((d) => seenH.has(d.id)).length}/${content.heroes.length}`;
    } else if (tab === 'items') {
      tiles = content.items.map((d) => tile(`coll-item-${d.id}`, seenI.has(d.id), d.name, icon(seenI.has(d.id) ? `item.${d.id}` : 'ui.unknown', 48), () => (seenI.has(d.id) ? showItemInfo(d.id) : toast('Not found yet.'))));
      count = `${content.items.filter((d) => seenI.has(d.id)).length}/${content.items.length}`;
    } else {
      tiles = content.enemies.map((d) => tile(`coll-enemy-${d.id}`, seenE.has(d.id), d.name, seenE.has(d.id) ? spriteImg(enemySpriteId(d.id), 1) : icon('ui.unknown', 48), () => (seenE.has(d.id) ? showEnemyDefInfo(d.id) : toast('Not met yet.'))));
      count = `${content.enemies.filter((d) => seenE.has(d.id)).length}/${content.enemies.length}`;
    }
    replace(el,
      topBar('Collection', back),
      h('div', { class: 'tabs', testid: 'coll-tabs' },
        ...(['heroes', 'items', 'enemies'] as Tab[]).map((t) =>
          h('button', { class: `tab${tab === t ? ' on' : ''}`, testid: `tab-${t}`, text: t[0]?.toUpperCase() + t.slice(1), onClick: () => { tab = t; paint(); } }),
        ),
      ),
      h('p', { class: 'hint center', testid: 'coll-count', text: `Seen ${count}` }),
      scrollBox('collection', { class: 'tile-grid' }, ...tiles),
    );
  }
  paint();
  return { el };
}

// ------------------------------------------------------------ feats

export function buildFeats(): Screen {
  const profile = game().profile;
  const done = new Set(profile.featsDone);
  const el = h('main', { class: 'screen', testid: 'screen-feats' },
    topBar('Feats', back),
    h('p', { class: 'hint center', testid: 'feats-count', text: `${content.feats.filter((f) => done.has(f.id)).length} of ${content.feats.length} done` }),
    scrollBox('feats', { class: 'list' },
      ...content.feats.map((f) => {
        const ok = done.has(f.id);
        const rewards = [
          ...(f.unlocks?.heroes ?? []).map((x) => `Hero: ${heroName(x)}`),
          ...(f.unlocks?.items ?? []).map((x) => `Item: ${itemName(x)}`),
        ];
        return h('div', { class: `feat${ok ? ' done' : ''}`, testid: `feat-${f.id}`, attrs: { 'data-done': String(ok) } },
          icon(ok ? 'ui.feat' : 'ui.feat_locked', 36),
          h('div', { class: 'feat-text' }, h('strong', { text: f.name }), h('span', { text: f.text }), rewards.length ? h('small', { class: 'hint', text: `Unlocks ${rewards.join(', ')}` }) : null),
        );
      }),
    ),
  );
  return { el };
}

// ------------------------------------------------------------ stats

export function buildStats(): Screen {
  const p = game().profile;
  const s = p.stats;
  const rate = s.runsPlayed > 0 ? Math.round((s.runsWon / s.runsPlayed) * 100) : 0;
  const row = (label: string, value: string, testid: string): HTMLElement =>
    h('div', { class: 'stat-row', testid }, h('span', { text: label }), h('b', { text: value, testid: `${testid}-value` }));
  const el = h('main', { class: 'screen', testid: 'screen-stats' },
    topBar('Stats', back),
    scrollBox('stats', { class: 'list' },
      row('Runs played', String(s.runsPlayed), 'stat-runs'),
      row('Runs won', String(s.runsWon), 'stat-wins'),
      row('Win rate', `${rate}%`, 'stat-winrate'),
      row('Current streak', String(s.winStreak), 'stat-streak'),
      row('Best streak', String(s.bestStreak), 'stat-best-streak'),
      row('Highest tier won', s.tierWon >= 0 ? (s.tierWon === 0 ? 'Base' : `Tier ${s.tierWon}`) : 'none yet', 'stat-tier'),
      row('Feats done', `${p.featsDone.length} / ${content.feats.length}`, 'stat-feats'),
      row('Daily runs won', String(s.dailyWins), 'stat-daily-wins'),
      h('h3', { class: 'sheet-sub', text: 'By hero' }),
      ...content.heroes.map((d) => {
        const r = s.perHero[d.id] ?? { runs: 0, wins: 0 };
        return row(shortName(d.id), `${r.wins} wins / ${r.runs} runs`, `stat-hero-${d.id}`);
      }),
    ),
  );
  return { el };
}

// ------------------------------------------------------------ daily

export function buildDaily(): Screen {
  const profile = game().profile;
  const key = localDateKey();
  const heroes = engine.dailyHeroes(key);
  const rec = profile.daily[key];
  const history = Object.entries(profile.daily).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const el = h('main', { class: 'screen', testid: 'screen-daily' },
    topBar('Daily run', back),
    h('p', { class: 'center', testid: 'daily-date', text: key }),
    h('div', { class: 'daily-party' },
      ...heroes.map((id) => h('div', { class: 'mini-hero' }, h('div', { class: 'mini-art' }, portrait(`hero.${id}`)), h('strong', { text: shortName(id) }))),
    ),
    h('p', { class: 'hint center', text: 'Same party, same fights, same rewards every try today.' }),
    h('p', { class: 'center', testid: 'daily-best', text: rec ? `Best today: ${rec.bestScore}${rec.won ? ' (won)' : ''} · ${rec.attempts} attempt${rec.attempts === 1 ? '' : 's'}` : 'Not played yet today' }),
    h('button', {
      class: 'btn primary big',
      testid: 'btn-start-daily',
      text: rec ? 'Try again' : 'Start daily run',
      onClick: () => {
        try {
          dispatch({ type: 'startDaily', dateKey: key });
          go('home');
        } catch (e) {
          toast(e instanceof Error ? e.message : 'Could not start.');
        }
      },
    }),
    h('h3', { class: 'sheet-sub', text: 'History' }),
    scrollBox('daily', {},
      h('div', { class: 'list', testid: 'daily-history' },
        history.length === 0 ? h('p', { class: 'hint', text: 'No daily runs yet.' }) : null,
        ...history.map(([date, r]) => h('div', { class: 'stat-row', testid: `daily-${date}` }, h('span', { text: date }), h('b', { text: `${r.bestScore}${r.won ? ' won' : ''} (${r.attempts}x)` }))),
      ),
    ),
  );
  return { el };
}
