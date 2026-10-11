/**
 * Interface preferences that belong to this phone, not to the game: kept in localStorage under
 * `pip-and-blade.prefs`, beside (never inside) the save file, so saves made by any version load
 * unchanged. Every field has a safe default when missing, unreadable or of the wrong type.
 */
const KEY = 'pip-and-blade.prefs';

export interface Prefs {
  /** "Always choose the target myself": single-target dice also wait for a target tap. */
  chooseTarget: boolean;
  /** The "add to Home Screen" tip was dismissed: never show it again. */
  installTipDismissed: boolean;
}

const DEFAULTS: Prefs = { chooseTarget: false, installTipDismissed: false };

let cache: Prefs | null = null;
const listeners = new Set<() => void>();

function read(): Prefs {
  const out: Prefs = { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    const obj: unknown = raw ? JSON.parse(raw) : null;
    if (obj && typeof obj === 'object') {
      const o = obj as Record<string, unknown>;
      for (const k of Object.keys(DEFAULTS) as (keyof Prefs)[]) if (typeof o[k] === 'boolean') out[k] = o[k];
    }
  } catch {
    /* unreadable: defaults */
  }
  return out;
}

export function prefs(): Prefs {
  cache ??= read();
  return cache;
}

export function setPrefs(patch: Partial<Prefs>): void {
  cache = { ...prefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked: the choice still holds until the app is closed */
  }
  for (const l of [...listeners]) l();
}

export function onPrefs(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Back to the defaults (used by "Reset progress"). */
export function resetPrefs(): void {
  cache = { ...DEFAULTS };
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  for (const l of [...listeners]) l();
}
