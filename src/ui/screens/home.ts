import { icon, spriteImg, spriteInfo } from '../art';
import { h } from '../dom';
import { engine } from '../engine';
import { prefs, setPrefs } from '../prefs';
import { isStandalone } from '../scroll';
import { dispatch, game, go, loadProblem, localDateKey } from '../store';
import { tutorialReset } from '../tutorial';
import { modal } from '../ui';
import type { Screen } from './types';

/** Title screen. Only shown when no run is in progress (a run in progress resumes directly). */
export function buildHome(): Screen {
  const g = engine ? game() : null;
  const dailyDone = g?.profile.daily[localDateKey()];

  // In a browser tab (not launched from the Home Screen): a one-time tip that installing gives more room.
  let tip: HTMLElement | null = null;
  if (!isStandalone() && !prefs().installTipDismissed) {
    tip = h('aside', { class: 'tip-card', testid: 'install-tip' },
      h('div', { class: 'tip-text' },
        h('strong', { text: 'Tip: add Pip & Blade to your Home Screen for a bigger play area' }),
        h('ol', {},
          h('li', {}, 'Tap ', icon('ui.install', 18, 'tip-icon'), h('b', { text: 'Share' }), ' in Safari’s toolbar'),
          h('li', {}, 'Choose ', h('b', { text: 'Add to Home Screen' })),
          h('li', {}, 'Tap ', h('b', { text: 'Add' })),
        ),
      ),
      h('button', {
        class: 'btn small',
        testid: 'install-tip-dismiss',
        text: 'Got it',
        onClick: () => {
          setPrefs({ installTipDismissed: true });
          tip?.remove();
        },
      }),
    );
  }

  // The logo takes whatever height is left over (it is a vector drawing: any size is sharp).
  const native = spriteInfo('ui.logo');
  const ratio = native ? native.h / native.w : 0.75;
  const room = window.innerHeight - 290 - (tip ? 100 : 0) - 70;
  const logoW = Math.max(0, Math.min(240, Math.floor(room / ratio)));

  const el = h('main', { class: `screen home${logoW < 120 ? ' short' : ''}`, testid: 'screen-home' },
    h('div', { class: 'home-logo' },
      logoW >= 80 ? spriteImg('ui.logo', logoW, 'logo-art') : null,
      h('h1', { class: 'title', testid: 'title', text: 'Pip & Blade' }),
      h('p', { class: 'tagline', text: 'Roll. Lock. Strike.' }),
    ),
    !engine ? h('p', { class: 'notice', testid: 'engine-missing', text: 'The game engine is not available in this build.' }) : null,
    loadProblem() ? h('p', { class: 'notice', testid: 'load-problem', text: 'Your last save could not be read, so a fresh one was started. The old data is kept aside on this phone.' }) : null,
    tip,
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
  return {
    el,
    // Now that it is on screen: if the logo block does not fit, step the logo down, then drop the tagline.
    mounted: () => {
      const box = el.querySelector<HTMLElement>('.home-logo');
      const logo = el.querySelector<HTMLElement>('.logo-art');
      if (!box || !logo) return;
      let w = logoW;
      const fits = (): boolean => box.scrollHeight <= box.clientHeight + 1;
      while (!fits() && w > 96) {
        w = Math.max(96, w - 24);
        logo.style.width = `${w}px`;
        logo.style.height = `${Math.round(w * ratio)}px`;
      }
      if (!fits()) el.classList.add('short');
      if (!fits()) logo.style.display = 'none';
    },
  };
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
