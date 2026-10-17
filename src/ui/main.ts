import '@art/generated/palette.css';
import './styles.css';
import type { Action, HeroId } from '@shared';
import { isIdle, track, waitIdle } from './anim';
import { ALL_SPRITE_IDS, inlineIcons, installBackdrops, preload, urlOf } from './art';
import { engine } from './engine';
import { startRouter, screenName } from './router';
import { lockPageGestures, trackViewport } from './scroll';
import { canDispatch, dispatch, game, init, isReady, saveFile, settings, startRunWithSeed, subscribe } from './store';

/** reduce-motion = the in-game setting OR the phone's own setting. */
function applyMotion(): void {
  const os = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on = os || (isReady() ? settings().reduceMotion : false);
  document.documentElement.dataset['motion'] = on ? 'reduced' : 'full';
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
  // Surfaces are drawn by CSS (never bare). Icons and backdrops are fetched and decoded up
  // front so a screen never shows a hole where a picture is still loading (waitIdle() covers this).
  installBackdrops();
  void track(preload(ALL_SPRITE_IDS.filter((id) => /^(bg|ui)\./.test(id))));
  // The first screen waits (at most 2.5 s) until the icons are in the page, so none is drawn blank.
  await track(inlineIcons());
  const rotate = document.querySelector<HTMLImageElement>('.rotate-phone');
  const rotateUrl = urlOf('ui.rotate');
  if (rotate && rotateUrl) rotate.src = rotateUrl;
  lockPageGestures();
  trackViewport();
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
