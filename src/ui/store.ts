/**
 * The app's single source of truth in the browser: the current SaveFile (game + settings),
 * which menu is open, and the one place actions go through. Every successful action is saved
 * straight away.
 */
import type { Action, GameEvent, GameState, HeroId, SaveFile, Settings } from '@shared';
import { engine } from './engine';
import { clearTutorialOffer } from './tutorial';
import { loadSaveText, requestPersistence, saveText } from './storage';

export type MenuScreen = 'home' | 'heroselect' | 'collection' | 'feats' | 'stats' | 'daily' | 'settings';

export type Listener = (events: GameEvent[], action: Action | null) => void;

interface Store {
  save: SaveFile | null;
  menu: MenuScreen;
  ready: boolean;
  /** Set if a stored save was unreadable (we keep the broken text aside, never overwrite silently). */
  loadProblem: string | null;
}

const s: Store = { save: null, menu: 'home', ready: false, loadProblem: null };
const listeners = new Set<Listener>();

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function notify(events: GameEvent[], action: Action | null): void {
  for (const l of [...listeners]) l(events, action);
}

export const isReady = (): boolean => s.ready;
export const loadProblem = (): string | null => s.loadProblem;
export const menu = (): MenuScreen => s.menu;

export function saveFile(): SaveFile {
  if (!s.save) throw new Error('Game not loaded yet.');
  return s.save;
}
export const game = (): GameState => saveFile().game;
export const settings = (): Settings => saveFile().settings;

export { localDateKey } from './date';

/** Load the stored game (or start fresh) and ask for persistent storage. */
export async function init(): Promise<void> {
  if (engine) {
    const text = await loadSaveText();
    if (text) {
      try {
        s.save = engine.load(text);
      } catch (e) {
        s.loadProblem = e instanceof Error ? e.message : 'Unreadable save';
        try {
          localStorage.setItem('pip-and-blade.unreadable-save', text);
        } catch {
          /* ignore */
        }
        s.save = engine.newSave();
      }
    } else {
      s.save = engine.newSave();
    }
  }
  s.ready = true;
  void requestPersistence();
  notify([], null);
}

function persist(): Promise<void> {
  if (!engine || !s.save) return Promise.resolve();
  return saveText(engine.save(s.save));
}

/** Apply an action, save, and tell the screens. Throws IllegalActionError if not legal. */
export function dispatch(action: Action): GameEvent[] {
  const eng = engine;
  const file = saveFile();
  const result = eng.apply(file.game, action);
  file.game = result.game;
  void persist();
  notify(result.events, action);
  return result.events;
}

export function canDispatch(action: Action): boolean {
  return engine ? engine.canApply(game(), action) : false;
}

export function setSettings(patch: Partial<Settings>): void {
  const file = saveFile();
  file.settings = { ...file.settings, ...patch };
  void persist();
  notify([], null);
}

export function go(screen: MenuScreen): void {
  s.menu = screen;
  notify([], null);
}

/** Replace everything with an imported save (already validated by engine.load). */
export function replaceSave(file: SaveFile): void {
  s.save = file;
  s.menu = 'home';
  void persist();
  notify([], null);
}

/** Wipe progress and any run; keep the player's settings. */
export function resetProgress(): void {
  const eng = engine;
  const keep = settings();
  clearTutorialOffer();
  const fresh = eng.newSave();
  fresh.settings = { ...fresh.settings, ...keep };
  s.save = fresh;
  s.menu = 'home';
  void persist();
  notify([], null);
}

export function startRunWithSeed(heroes: [HeroId, HeroId, HeroId], tier: number, seed: string): GameEvent[] {
  return dispatch({ type: 'startRun', heroes, tier, seed });
}

/** Events of the action that caused the current screen change (so a freshly built fight screen can animate them). */
export const incoming: { events: GameEvent[]; action: Action | null } = { events: [], action: null };
