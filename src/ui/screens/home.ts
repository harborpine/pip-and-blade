import { spriteImg } from '../art';
import { h } from '../dom';
import { engine } from '../engine';
import { dispatch, game, go, loadProblem, localDateKey } from '../store';
import { tutorialReset } from '../tutorial';
import { modal } from '../ui';
import type { Screen } from './types';

/** Title screen. Only shown when no run is in progress (a run in progress resumes directly). */
export function buildHome(): Screen {
  const g = engine ? game() : null;
  const dailyDone = g?.profile.daily[localDateKey()];

  const el = h('main', { class: 'screen home', testid: 'screen-home' },
    h('div', { class: 'home-logo' },
      spriteImg('ui.logo', 4, 'logo-art'),
      h('h1', { class: 'title', testid: 'title', text: 'Pip & Blade' }),
      h('p', { class: 'tagline', text: 'Roll. Lock. Strike.' }),
    ),
    !engine ? h('p', { class: 'notice', testid: 'engine-missing', text: 'The game engine is not available in this build.' }) : null,
    loadProblem() ? h('p', { class: 'notice', testid: 'load-problem', text: 'Your last save could not be read, so a fresh one was started. The old data is kept aside on this phone.' }) : null,
    h('nav', { class: 'menu-stack' },
      h('button', { class: 'btn primary big', testid: 'btn-new-run', text: 'New run', disabled: !engine, onClick: () => go('heroselect') }),
      h('button', { class: 'btn plain big', testid: 'btn-daily', text: dailyDone ? 'Daily run (played)' : 'Daily run', disabled: !engine, onClick: () => go('daily') }),
      h('div', { class: 'menu-row' },
        h('button', { class: 'btn plain', testid: 'btn-collection', text: 'Collection', disabled: !engine, onClick: () => go('collection') }),
        h('button', { class: 'btn plain', testid: 'btn-feats', text: 'Feats', disabled: !engine, onClick: () => go('feats') }),
      ),
      h('div', { class: 'menu-row' },
        h('button', { class: 'btn plain', testid: 'btn-stats', text: 'Stats', disabled: !engine, onClick: () => go('stats') }),
        h('button', { class: 'btn plain', testid: 'btn-settings', text: 'Settings', disabled: !engine, onClick: () => go('settings') }),
      ),
    ),
  );
  if (engine) queueMicrotask(maybeOfferTutorial);
  return { el };
}

const OFFERED_KEY = 'pip-and-blade.tutorialOffered';


export function maybeOfferTutorial(): void {
  const profile = game().profile;
  if (profile.tutorialDone || game().run) return;
  try {
    if (localStorage.getItem(OFFERED_KEY)) return;
    localStorage.setItem(OFFERED_KEY, '1');
  } catch {
    return;
  }
  modal({
    testid: 'tutorial-offer',
    title: 'New here?',
    body: ['Play a short guided fight that teaches rolling, locking, rerolling and targeting.'],
    buttons: [
      { label: 'No thanks', testid: 'tutorial-offer-no' },
      {
        label: 'Show me',
        testid: 'tutorial-offer-yes',
        kind: 'primary',
        onClick: () => {
          tutorialReset();
          dispatch({ type: 'startTutorial' });
        },
      },
    ],
  });
}
