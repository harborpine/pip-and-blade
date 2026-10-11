/**
 * Chooses which screen to show from the saved state, and swaps it in. A run in progress always
 * wins over the title screen, so reopening the app drops you straight back into your run.
 */
import type { Action, GameEvent } from '@shared';
import { clear, must } from './dom';
import { engine } from './engine';
import { buildFight } from './screens/fight';
import { buildDoors, buildEnd, buildEvent, buildReward, buildRest, buildShop } from './screens/flow';
import { buildCollection, buildDaily, buildFeats, buildStats } from './screens/meta';
import { buildHeroSelect } from './screens/heroselect';
import { buildHome } from './screens/home';
import { buildPlaceholder } from './screens/placeholder';
import { buildSettings } from './screens/settings';
import type { Screen, ScreenBuilder } from './screens/types';
import { incoming, game, isReady, menu, subscribe } from './store';
import { hold } from './anim';

const builders: Record<string, ScreenBuilder> = {
  home: buildHome,
  settings: buildSettings,
  heroselect: buildHeroSelect,
  fight: buildFight,
  reward: buildReward,
  doors: buildDoors,
  rest: buildRest,
  shop: buildShop,
  event: buildEvent,
  victory: buildEnd(true),
  defeat: buildEnd(false),
  collection: buildCollection,
  feats: buildFeats,
  stats: buildStats,
  daily: buildDaily,
};

export function register(name: string, builder: ScreenBuilder): void {
  builders[name] = builder;
}

export function screenName(): string {
  if (!isReady()) return 'boot';
  if (!engine) return 'home';
  const m = menu();
  if (m !== 'home') return m;
  const run = game().run;
  return run ? run.phase : 'home';
}

let current: { name: string; screen: Screen } | null = null;
let token = 0;

function swap(events: GameEvent[] = [], action: Action | null = null): void {
  const name = screenName();
  if (name === 'boot') return;
  const root = must(document.getElementById('app'), '#app');
  current?.screen.destroy?.();
  const build = builders[name] ?? ((): Screen => buildPlaceholder(name));
  incoming.events = events;
  incoming.action = action;
  const screen = build();
  incoming.events = [];
  incoming.action = null;
  clear(root);
  screen.el.classList.add('screen-enter');
  root.append(screen.el);
  current = { name, screen };
  document.body.dataset['screen'] = name;
  screen.mounted?.();
}

export function render(events: GameEvent[] = [], action: Action | null = null): void {
  const name = screenName();
  if (name === 'boot') return;
  if (current && current.name === name && current.screen.update) {
    current.screen.update(events, action);
    return;
  }
  if (current && current.screen.leave && events.length > 0) {
    const mine = ++token;
    const release = hold();
    void current.screen.leave(events, action).then(() => {
      if (mine === token) swap(events, action);
      release();
    });
    return;
  }
  token += 1;
  swap(events, action);
}

export function startRouter(): void {
  subscribe((events, action) => render(events, action));
  render();
}
