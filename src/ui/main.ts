import './styles.css';
import type { Action, HeroId } from '@shared';
import { isIdle, waitIdle } from './anim';
import { engine } from './engine';
import { startRouter, screenName } from './router';
import { canDispatch, dispatch, game, init, isReady, saveFile, settings, startRunWithSeed, subscribe } from './store';

/** reduce-motion = the in-game setting OR the phone's own setting. */
function applyMotion(): void {
  const os = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on = os || (isReady() ? settings().reduceMotion : false);
  document.documentElement.dataset['motion'] = on ? 'reduced' : 'full';
}

/** No page scroll, bounce, pinch or double-tap zoom, text selection or callouts during play. */
function lockGestures(): void {
  for (const t of ['gesturestart', 'gesturechange', 'gestureend'] as const) {
    document.addEventListener(t, (e) => e.preventDefault());
  }
  document.addEventListener('touchmove', (e) => {
    const target = e.target as Element | null;
    if (!target?.closest?.('.scrollable')) e.preventDefault();
  }, { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
}

declare global {
  interface Window {
    __pip: unknown;
  }
}

function installDebugHook(): void {
  window.__pip = {
    /** Current GameState (profile + run). */
    getState: () => (engine ? game() : null),
    getSave: () => (engine ? saveFile() : null),
    engine,
    screen: () => screenName(),
    dispatch: (action: Action) => dispatch(action),
    canDispatch: (action: Action) => canDispatch(action),
    /** Start a standard run with a fixed seed: deterministic play for tests. */
    startRun: (heroes: [HeroId, HeroId, HeroId], tier = 0, seed = 'test') => startRunWithSeed(heroes, tier, seed),
    setSeed: (heroes: [HeroId, HeroId, HeroId], seed: string, tier = 0) => startRunWithSeed(heroes, tier, seed),
    /** Resolves when no animation is in flight. */
    waitIdle: () => waitIdle(),
    isIdle: () => isIdle(),
  };
}

async function main(): Promise<void> {
  lockGestures();
  installDebugHook();
  applyMotion();
  matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', applyMotion);
  subscribe(() => applyMotion());
  startRouter();
  await init();
}

/** Offline support: the service worker is registered here (production builds only), after the page has loaded. */
function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const go = (): void => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL }).catch(() => {});
  };
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
}

registerServiceWorker();
void main();
