/**
 * Save storage: IndexedDB first, localStorage as a mirror/fallback. What is stored is the exact
 * text produced by engine.save(). Writes are queued so the newest always lands last.
 */
const DB_NAME = 'pip-and-blade';
const STORE = 'kv';
const KEY = 'save';
const LS_KEY = 'pip-and-blade.save';

interface Envelope {
  t: number;
  text: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no indexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'));
  });
}

async function idbGet(): Promise<Envelope | null> {
  const db = await openDb();
  try {
    return await new Promise<Envelope | null>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as Envelope | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error('indexedDB read failed'));
    });
  } finally {
    db.close();
  }
}

async function idbSet(env: Envelope): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(env, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('indexedDB write failed'));
      tx.onabort = () => reject(tx.error ?? new Error('indexedDB write aborted'));
    });
  } finally {
    db.close();
  }
}

function lsGet(): Envelope | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope;
    return typeof env.text === 'string' ? env : null;
  } catch {
    return null;
  }
}

function lsSet(env: Envelope): boolean {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(env));
    return true;
  } catch {
    return false;
  }
}

/** The newest saved text from either store, or null if nothing is saved. */
export async function loadSaveText(): Promise<string | null> {
  const a: Envelope | null = await idbGet().catch(() => null);
  const b = lsGet();
  const best = a && b ? (a.t >= b.t ? a : b) : (a ?? b);
  return best ? best.text : null;
}

let chain: Promise<void> = Promise.resolve();
let pending = 0;
let lastError: string | null = null;

/** Save text. The localStorage mirror is written synchronously (survives a sudden app kill). */
export function saveText(text: string): Promise<void> {
  const env: Envelope = { t: Date.now(), text };
  lsSet(env);
  pending += 1;
  chain = chain
    .then(() => idbSet(env))
    .then(
      () => {
        lastError = null;
      },
      (e: unknown) => {
        lastError = e instanceof Error ? e.message : String(e);
      },
    )
    .then(() => {
      pending -= 1;
    });
  return chain;
}

export const storageStatus = (): { pending: number; lastError: string | null } => ({ pending, lastError });

let persistAsked = false;
/** Ask the browser not to evict our data. Once per launch is plenty. */
export async function requestPersistence(): Promise<boolean> {
  if (persistAsked) return false;
  persistAsked = true;
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      if (navigator.storage.persisted && (await navigator.storage.persisted())) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Download text as a file. */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
