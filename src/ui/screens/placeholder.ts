import { h } from '../dom';
import { go } from '../store';
import { topBar } from '../ui';
import type { Screen } from './types';

/** Stand-in for a screen that is not built yet. Removed screen by screen as they land. */
export function buildPlaceholder(name: string): Screen {
  return {
    el: h('main', { class: 'screen', testid: `screen-${name}` },
      topBar(name, () => go('home')),
      h('p', { class: 'notice', text: 'Coming soon.' }),
    ),
  };
}
